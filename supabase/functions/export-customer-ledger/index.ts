// index.ts — Supabase Edge Function: export-customer-ledger
// Generates an official .xlsx Customer Ledger Statement for a customer,
// complete with letterhead, GSTIN, wallet balance, and running installment breakdown.

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
// @ts-ignore
import ExcelJS from 'npm:exceljs@4.4.0';

declare const Deno: any;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function formatDateIST(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return dateStr;
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as any);
  }
  return btoa(binary);
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check: verify token
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const customerId = body.customer_id;

    if (!customerId) {
      return new Response(JSON.stringify({ error: 'Missing required field: customer_id' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch customer details
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('id, name, phone, email, address, gstin, advance_balance')
      .eq('id', customerId)
      .single();

    if (custError || !customer) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch all invoices for this customer
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_code,
        created_at,
        grand_total,
        amount_paid,
        status,
        job_id,
        jobs:job_id (
          job_code
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });

    if (invError) throw invError;

    // 3. Fetch all payments for this customer
    const invoiceIds = (invoices || []).map((i: any) => i.id);
    let payments: any[] = [];
    if (invoiceIds.length > 0) {
      const { data: pData, error: pError } = await supabase
        .from('payments')
        .select('*')
        .in('invoice_id', invoiceIds)
        .order('created_at', { ascending: true });

      if (pError) throw pError;
      payments = pData || [];
    }

    // 4. Calculate financial summary totals
    let totalInvoiced = 0;
    let totalPaid = 0;

    (invoices || []).forEach((inv: any) => {
      totalInvoiced += Number(inv.grand_total || 0);
      const invPayments = payments.filter((p: any) => p.invoice_id === inv.id);
      if (invPayments.length > 0) {
        invPayments.forEach((p: any) => {
          totalPaid += Number(p.amount || 0);
        });
      } else {
        totalPaid += Number(inv.amount_paid || 0);
      }
    });

    const pendingBalance = Math.max(0, totalInvoiced - totalPaid);
    const walletBalance = Number(customer.advance_balance || 0);

    // -------------------------------------------------------------
    // Build ExcelJS Workbook
    // -------------------------------------------------------------
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Digital Solution';
    wb.lastModifiedBy = 'Digital Solution System';
    wb.created = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet('Customer_Ledger', {
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 13 }],
    });

    ws.columns = [
      { key: 'customer', width: 24 },       // A: Customer
      { key: 'invoiceCode', width: 18 },     // B: Invoice #
      { key: 'jobCode', width: 18 },         // C: Job #
      { key: 'totalAmount', width: 17 },     // D: Total Amount
      { key: 'paymentDate', width: 16 },     // E: Payment Date
      { key: 'amountPaid', width: 26 },      // F: Amount Paid (this installment)
      { key: 'paymentMethod', width: 18 },   // G: Payment Method
      { key: 'referenceNumber', width: 22 }, // H: Reference #
      { key: 'amountLeft', width: 28 },      // I: Amount Left After This Payment
      { key: 'status', width: 18 },          // J: Status
    ];

    const BRAND_NAVY = 'FF14337A';
    const BRAND_ACCENT = 'FF1E56CC';
    const BG_LIGHT_ROW = 'FFF8FAFC';
    const BG_WHITE = 'FFFFFFFF';
    const BG_CARD_LABEL = 'FFF1F5F9';
    const BORDER_COLOR = 'FFE2E8F0';
    const BORDER_DARK = 'FFCBD5E1';

    const thinBorder = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };

    const headerBorder = {
      top: { style: 'thin', color: { argb: BRAND_NAVY } },
      bottom: { style: 'medium', color: { argb: BRAND_NAVY } },
      left: { style: 'thin', color: { argb: 'FF2A4E9E' } },
      right: { style: 'thin', color: { argb: 'FF2A4E9E' } },
    };

    const applyBoxBorder = (startRow: number, startCol: number, endRow: number, endCol: number) => {
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const cell = ws.getCell(r, c);
          cell.border = {
            top: { style: 'thin', color: { argb: BORDER_DARK } },
            bottom: { style: 'thin', color: { argb: BORDER_DARK } },
            left: { style: 'thin', color: { argb: BORDER_DARK } },
            right: { style: 'thin', color: { argb: BORDER_DARK } },
          };
        }
      }
    };

    // Row 1: Statement Title
    ws.mergeCells('A1:J1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'Digital Solution — Customer Ledger Statement';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_NAVY } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 36;

    // Row 2: Metadata
    ws.mergeCells('A2:J2');
    const metaCell = ws.getCell('A2');
    const nowStr = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    metaCell.value = `Generated On: ${nowStr} (IST)`;
    metaCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 18;

    ws.getRow(3).height = 10;

    // Row 4: Section Header — CUSTOMER DETAILS
    ws.mergeCells('A4:J4');
    const custHeader = ws.getCell('A4');
    custHeader.value = '  CUSTOMER DETAILS';
    custHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    custHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_ACCENT } };
    custHeader.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(4).height = 24;

    // Row 5: Name & Phone
    ws.getCell('A5').value = 'Customer Name:';
    ws.getCell('A5').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    ws.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_CARD_LABEL } };
    ws.getCell('A5').alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('B5:D5');
    ws.getCell('B5').value = customer.name;
    ws.getCell('B5').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    ws.getCell('B5').alignment = { vertical: 'middle', horizontal: 'left' };

    ws.getCell('E5').value = 'Contact Phone:';
    ws.getCell('E5').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    ws.getCell('E5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_CARD_LABEL } };
    ws.getCell('E5').alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('F5:J5');
    ws.getCell('F5').value = customer.phone || '—';
    ws.getCell('F5').font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
    ws.getCell('F5').alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(5).height = 22;

    // Row 6: Email & GSTIN
    ws.getCell('A6').value = 'Email Address:';
    ws.getCell('A6').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    ws.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_CARD_LABEL } };
    ws.getCell('A6').alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('B6:D6');
    ws.getCell('B6').value = customer.email || '—';
    ws.getCell('B6').font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
    ws.getCell('B6').alignment = { vertical: 'middle', horizontal: 'left' };

    ws.getCell('E6').value = 'GSTIN:';
    ws.getCell('E6').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    ws.getCell('E6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_CARD_LABEL } };
    ws.getCell('E6').alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('F6:J6');
    ws.getCell('F6').value = customer.gstin || '—';
    ws.getCell('F6').font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
    ws.getCell('F6').alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(6).height = 22;

    // Row 7: Address
    ws.getCell('A7').value = 'Address:';
    ws.getCell('A7').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    ws.getCell('A7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_CARD_LABEL } };
    ws.getCell('A7').alignment = { vertical: 'top', horizontal: 'left' };

    ws.mergeCells('B7:J7');
    ws.getCell('B7').value = customer.address || 'No address on file';
    ws.getCell('B7').font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
    ws.getCell('B7').alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    ws.getRow(7).height = 26;

    applyBoxBorder(5, 1, 7, 10);
    ws.getRow(8).height = 10;

    // Row 9: Section Header — FINANCIAL SUMMARY
    ws.mergeCells('A9:J9');
    const finHeader = ws.getCell('A9');
    finHeader.value = '  FINANCIAL SUMMARY';
    finHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    finHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_ACCENT } };
    finHeader.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(9).height = 24;

    // Row 10: Financial Stat Card Labels
    ws.mergeCells('A10:B10');
    ws.getCell('A10').value = 'Wallet Advance Balance';
    ws.mergeCells('C10:D10');
    ws.getCell('C10').value = 'Total Invoiced';
    ws.mergeCells('E10:G10');
    ws.getCell('E10').value = 'Total Collected';
    ws.mergeCells('H10:J10');
    ws.getCell('H10').value = 'Total Outstanding Due';

    ['A10', 'C10', 'E10', 'H10'].forEach((pos) => {
      const c = ws.getCell(pos);
      c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF2FA' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(10).height = 20;

    // Row 11: Financial Stat Card Values
    ws.mergeCells('A11:B11');
    const cWallet = ws.getCell('A11');
    cWallet.value = walletBalance;
    cWallet.numFmt = '"₹"#,##0.00';
    cWallet.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0284C7' } };
    cWallet.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('C11:D11');
    const cInvoiced = ws.getCell('C11');
    cInvoiced.value = totalInvoiced;
    cInvoiced.numFmt = '"₹"#,##0.00';
    cInvoiced.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    cInvoiced.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('E11:G11');
    const cPaid = ws.getCell('E11');
    cPaid.value = totalPaid;
    cPaid.numFmt = '"₹"#,##0.00';
    cPaid.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF059669' } };
    cPaid.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('H11:J11');
    const cPending = ws.getCell('H11');
    cPending.value = pendingBalance;
    cPending.numFmt = '"₹"#,##0.00';
    cPending.alignment = { vertical: 'middle', horizontal: 'center' };

    if (pendingBalance > 0) {
      cPending.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFDC2626' } };
      cPending.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    } else {
      cPending.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF059669' } };
      cPending.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    }

    ws.getRow(11).height = 28;

    applyBoxBorder(10, 1, 11, 2);
    applyBoxBorder(10, 3, 11, 4);
    applyBoxBorder(10, 5, 11, 7);
    applyBoxBorder(10, 8, 11, 10);
    ws.getRow(12).height = 12;

    // Row 13: Table Header Row
    const tableHeaders = [
      'Customer',
      'Invoice #',
      'Job #',
      'Total Amount',
      'Payment Date',
      'Amount Paid (this installment)',
      'Payment Method',
      'Reference #',
      'Amount Left After This Payment',
      'Status'
    ];

    const headerRow = ws.getRow(13);
    headerRow.values = tableHeaders;
    headerRow.height = 28;

    for (let c = 1; c <= 10; c++) {
      const cell = headerRow.getCell(c);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_NAVY } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = headerBorder;
    }

    // Populate data rows grouped by invoice
    let currentRowIdx = 14;

    (invoices || []).forEach((inv: any) => {
      const invPayments = payments.filter((p: any) => p.invoice_id === inv.id);
      const grandTotal = Number(inv.grand_total || 0);

      const appendRow = (
        pDate: string | null,
        amtPaid: number,
        method: string,
        ref: string,
        leftAfter: number,
        statusText: string,
        isSettled: boolean
      ) => {
        const isEven = (currentRowIdx % 2 === 0);
        const rowBg = isEven ? BG_LIGHT_ROW : BG_WHITE;
        const newRow = ws.getRow(currentRowIdx);
        newRow.height = 22;

        newRow.getCell(1).value = customer.name;
        newRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

        newRow.getCell(2).value = inv.invoice_code || '—';
        newRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        if (isSettled) newRow.getCell(2).font = { name: 'Arial', size: 10, bold: true };

        newRow.getCell(3).value = inv.jobs?.job_code || 'Direct Sale';
        newRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };

        newRow.getCell(4).value = grandTotal;
        newRow.getCell(4).numFmt = '"₹"#,##0.00';
        newRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
        if (isSettled) newRow.getCell(4).font = { name: 'Arial', size: 10, bold: true };

        newRow.getCell(5).value = pDate ? formatDateIST(pDate) : '—';
        newRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

        newRow.getCell(6).value = amtPaid;
        newRow.getCell(6).numFmt = '"₹"#,##0.00';
        newRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };

        newRow.getCell(7).value = method || '—';
        newRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };

        newRow.getCell(8).value = ref || '—';
        newRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };

        newRow.getCell(9).value = leftAfter;
        newRow.getCell(9).numFmt = '"₹"#,##0.00';
        newRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
        if (leftAfter <= 0) {
          newRow.getCell(9).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF059669' } };
        }

        newRow.getCell(10).value = statusText;
        newRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };

        for (let c = 1; c <= 10; c++) {
          newRow.getCell(c).border = thinBorder;
          if (c !== 10) {
            newRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          }
        }

        const sCell = newRow.getCell(10);
        if (statusText === 'Paid') {
          sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
          sCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF065F46' } };
        } else if (statusText === 'Partial') {
          sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          sCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
        } else if (statusText === 'Historical') {
          sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          sCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
        } else {
          sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          sCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
        }

        currentRowIdx++;
      };

      if (invPayments.length > 0) {
        invPayments.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        let runningPaid = 0;

        invPayments.forEach((p: any, pIdx: number) => {
          const amt = Number(p.amount || 0);
          runningPaid += amt;
          const leftAfter = Math.max(0, grandTotal - runningPaid);
          const isFull = leftAfter <= 0;
          const isLast = pIdx === invPayments.length - 1;

          appendRow(
            p.created_at,
            amt,
            p.payment_method || '—',
            p.reference_number || '—',
            leftAfter,
            isFull ? 'Paid' : 'Partial',
            isFull && isLast
          );
        });
      } else {
        const storedPaid = Number(inv.amount_paid || 0);
        if (storedPaid > 0) {
          const leftAfter = Math.max(0, grandTotal - storedPaid);
          appendRow(
            inv.created_at,
            storedPaid,
            'Historical Record',
            '—',
            leftAfter,
            'Historical',
            leftAfter <= 0
          );
        } else {
          appendRow(
            null,
            0,
            '—',
            '—',
            grandTotal,
            'Pending',
            false
          );
        }
      }
    });

    // Closing Footer Row
    const signoffRowIdx = currentRowIdx + 1;
    ws.mergeCells(`A${signoffRowIdx}:J${signoffRowIdx}`);
    const footerCell = ws.getCell(`A${signoffRowIdx}`);
    footerCell.value = 'Digital Solution — Internal Management System • Certified Customer Statement';
    footerCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
    footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
    footerCell.border = { top: { style: 'thin', color: { argb: BORDER_DARK } } };
    ws.getRow(signoffRowIdx).height = 24;

    const buffer = await wb.xlsx.writeBuffer();
    const base64Data = bufferToBase64(buffer);
    const cleanCustomerName = customer.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Customer_Ledger_${cleanCustomerName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new Response(JSON.stringify({
      success: true,
      filename,
      base64: base64Data,
    }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Error generating customer ledger XLSX:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
