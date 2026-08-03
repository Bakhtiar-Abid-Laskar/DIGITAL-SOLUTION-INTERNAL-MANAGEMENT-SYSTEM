/**
 * exportWorkbook.ts — Shared Deno helper for building monthly .xlsx exports.
 *
 * Builds a multi-sheet workbook containing:
 *   - Sheet "Jobs": all repair jobs for the target month
 *   - Sheet "Sales": all sales/invoices for the target month
 *   - Sheet "Stock Snapshot": current inventory at export time
 *
 * Data is fetched in pages of 500 rows to stay within Edge Function memory
 * limits regardless of data volume.
 *
 * Returns a Uint8Array of the .xlsx file binary, ready for Drive upload.
 */

// @ts-ignore — npm: specifier supported in Supabase Edge Functions (Deno)
import * as XLSX from 'npm:xlsx@0.18.5';

declare const Deno: any;

const PAGE_SIZE = 500;

/** Fetch all rows from a paginated Supabase query */
async function fetchAllPages<T>(
  supabase: any,
  table: string,
  selectQuery: string,
  filters: Record<string, string>,
  orderColumn = 'created_at'
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select(selectQuery)
      .range(from, from + PAGE_SIZE - 1)
      .order(orderColumn, { ascending: true });

    for (const [column, value] of Object.entries(filters)) {
      query = query.filter(column, 'gte', value.startsWith('>=') ? value.slice(2) : value)
                   .filter(column, 'lte', value.startsWith('<=') ? value.slice(2) : value);
    }

    // Re-build cleanly with .gte/.lte
    query = supabase
      .from(table)
      .select(selectQuery)
      .range(from, from + PAGE_SIZE - 1)
      .order(orderColumn, { ascending: true });

    for (const [column, { gte, lte }] of Object.entries(filters) as any) {
      if (gte) query = query.gte(column, gte);
      if (lte) query = query.lte(column, lte);
    }

    const { data, error } = await query;
    if (error) throw new Error(`[exportWorkbook] Query failed on ${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

/** Paginate without complex filter — pass a callback that builds the query */
async function paginateQuery<T>(
  queryBuilder: (from: number, to: number) => any
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryBuilder(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`[exportWorkbook] Paginated query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

/** Format a timestamptz or date string for display in the sheet */
function fmt(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return value;
  }
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return value;
  }
}

function currency(value: number | null | undefined): string {
  if (value == null) return '₹0.00';
  return `₹${Number(value).toFixed(2)}`;
}

/**
 * Build a monthly .xlsx workbook for the given year and month.
 *
 * @param supabase  - Supabase JS client (service role recommended for full access)
 * @param year      - 4-digit year (e.g. 2026)
 * @param month     - 1-indexed month (e.g. 8 for August)
 * @returns         - Uint8Array of the .xlsx binary
 */
export async function buildMonthlyWorkbook(
  supabase: any,
  year: number,
  month: number
): Promise<Uint8Array> {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const startIST = `${monthStr}-01T00:00:00+05:30`;
  const lastDay = new Date(year, month, 0).getDate();
  const endIST = `${monthStr}-${String(lastDay).padStart(2, '0')}T23:59:59+05:30`;

  // -----------------------------------------------------------------------
  // 1. Jobs sheet
  // -----------------------------------------------------------------------
  const jobRows = await paginateQuery<any>((from, to) =>
    supabase
      .from('jobs')
      .select(`
        job_code,
        customer_name,
        customer_contact,
        customer_email,
        device_type,
        reported_issue,
        remarks,
        work_notes,
        job_type,
        priority,
        status,
        created_at,
        completed_at,
        receptionist:receptionist_id(name),
        technician:technician_id(name),
        billing(parts_total, labour_charge, tax_percent, discount, grand_total, payment_status, payment_method)
      `)
      .gte('created_at', startIST)
      .lte('created_at', endIST)
      .order('created_at', { ascending: true })
      .range(from, to)
  );

  const jobsSheet = XLSX.utils.json_to_sheet(
    jobRows.map(j => ({
      'Job Code': j.job_code,
      'Customer Name': j.customer_name,
      'Contact': j.customer_contact,
      'Email': j.customer_email ?? '',
      'Device': j.device_type,
      'Issue': j.reported_issue,
      'Remarks': j.remarks ?? '',
      'Work Notes': j.work_notes ?? '',
      'Type': j.job_type,
      'Priority': j.priority,
      'Status': j.status,
      'Receptionist': j.receptionist?.name ?? '',
      'Technician': j.technician?.name ?? '',
      'Created At': fmt(j.created_at),
      'Completed At': fmt(j.completed_at),
      'Parts Total': currency(j.billing?.parts_total),
      'Labour': currency(j.billing?.labour_charge),
      'Tax %': j.billing?.tax_percent ?? 0,
      'Discount': currency(j.billing?.discount),
      'Grand Total': currency(j.billing?.grand_total),
      'Payment Method': j.billing?.payment_method ?? '',
      'Payment Status': j.billing?.payment_status ?? '',
    }))
  );

  // -----------------------------------------------------------------------
  // 2. Sales sheet
  // -----------------------------------------------------------------------
  const saleRows = await paginateQuery<any>((from, to) =>
    supabase
      .from('sales')
      .select(`
        invoice_number,
        customer_name,
        customer_contact,
        subtotal,
        tax_percent,
        discount,
        grand_total,
        payment_mode,
        created_at,
        created_by:created_by(name),
        sale_items(item_name, quantity, unit_price, total_price)
      `)
      .gte('created_at', startIST)
      .lte('created_at', endIST)
      .order('created_at', { ascending: true })
      .range(from, to)
  );

  const salesSheet = XLSX.utils.json_to_sheet(
    saleRows.map(s => {
      const itemsSummary = (s.sale_items ?? [])
        .map((i: any) => `${i.item_name} ×${i.quantity}`)
        .join('; ');
      return {
        'Invoice #': s.invoice_number,
        'Customer': s.customer_name,
        'Contact': s.customer_contact ?? '',
        'Items': itemsSummary,
        'Subtotal': currency(s.subtotal),
        'Tax %': s.tax_percent ?? 0,
        'Discount': currency(s.discount),
        'Grand Total': currency(s.grand_total),
        'Payment Mode': s.payment_mode,
        'Created By': s.created_by?.name ?? '',
        'Date': fmt(s.created_at),
      };
    })
  );

  // -----------------------------------------------------------------------
  // 3. Stock Snapshot sheet (current inventory, not month-filtered)
  // -----------------------------------------------------------------------
  const stockRows = await paginateQuery<any>((from, to) =>
    supabase
      .from('inventory')
      .select('item_name, unit, quantity, low_stock_threshold, cost_price, selling_price, last_updated')
      .order('item_name', { ascending: true })
      .range(from, to)
  );

  const stockSheet = XLSX.utils.json_to_sheet(
    stockRows.map(i => ({
      'Item Name': i.item_name,
      'Unit': i.unit ?? 'Pcs',
      'Qty on Hand': i.quantity,
      'Reorder Threshold': i.low_stock_threshold,
      'Cost Price': currency(i.cost_price),
      'Selling Price': currency(i.selling_price),
      'Last Updated': fmtDate(i.last_updated),
    }))
  );

  // Add note to Stock sheet header
  XLSX.utils.sheet_add_aoa(stockSheet, [
    [`Stock snapshot taken at export time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`]
  ], { origin: 'A1' });

  // -----------------------------------------------------------------------
  // Assemble workbook
  // -----------------------------------------------------------------------
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, jobsSheet, 'Jobs');
  XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales');
  XLSX.utils.book_append_sheet(wb, stockSheet, 'Stock Snapshot');

  // Write to buffer
  const buffer: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}
