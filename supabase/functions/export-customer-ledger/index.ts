// index.ts — Supabase Edge Function: export-customer-ledger
// Generates an official .xlsx Customer Ledger Statement for a customer,
// complete with letterhead, GSTIN, wallet balance, and running installment breakdown.

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
// @ts-ignore
import * as XLSX from 'npm:xlsx@0.18.5';

declare const Deno: any;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined) return '0.00';
  return Number(val).toFixed(2);
}

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

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Role check: admin or receptionist
    const { data: userRow, error: roleErr } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (roleErr || !userRow || !userRow.is_active || (userRow.role !== 'admin' && userRow.role !== 'receptionist')) {
      return new Response(JSON.stringify({ error: 'Forbidden: caller must be an active admin or receptionist' }), {
        status: 403,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const customerId = body.customer_id;
    if (!customerId) {
      return new Response(JSON.stringify({ error: 'customer_id is required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch customer details
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (custErr || !customer) {
      return new Response(JSON.stringify({ error: `Customer not found: ${custErr?.message || 'Unknown'}` }), {
        status: 404,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch invoices, invoice_payments, and wallet transactions in parallel
    const [invRes, payRes, walletRes] = await Promise.all([
      supabase
        .from('invoices')
        .select(`
          id,
          invoice_code,
          grand_total,
          amount_paid,
          status,
          created_at,
          payment_method,
          job_id,
          jobs (
            id,
            job_code
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),

      supabase
        .from('invoice_payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true }),

      supabase
        .from('customer_wallet_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
    ]);

    if (invRes.error) throw invRes.error;
    if (payRes.error) throw payRes.error;
    if (walletRes.error) throw walletRes.error;

    const invoices = invRes.data || [];
    const payments = payRes.data || [];
    const walletTransactions = walletRes.data || [];

    // Calculate live wallet balance
    const walletBalance = walletTransactions.reduce((acc: number, tx: any) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'deposit') return acc + amt;
      if (tx.type === 'applied_to_invoice' || tx.type === 'refund') return acc - amt;
      return acc;
    }, 0);

    // Summary calculations
    let totalInvoiced = 0;
    let totalPaid = 0;
    invoices.forEach((inv: any) => {
      totalInvoiced += Number(inv.grand_total || 0);
      totalPaid += Number(inv.amount_paid || 0);
    });
    const pendingBalance = Math.max(0, totalInvoiced - totalPaid);

    // Build the worksheet rows
    const wsData: any[][] = [];

    // -------------------------------------------------------------
    // Letterhead / Statement Header Block
    // -------------------------------------------------------------
    wsData.push(['RepairShop — Customer Ledger Statement']);
    wsData.push(['Generated On:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })]);
    wsData.push([]);
    wsData.push(['CUSTOMER DETAILS']);
    wsData.push(['Customer Name:', customer.name, '', 'Contact Phone:', customer.phone || '—']);
    wsData.push(['Email Address:', customer.email || '—', '', 'GSTIN:', customer.gstin || '—']);
    wsData.push(['Address:', customer.address || 'No address on file']);
    wsData.push([]);
    wsData.push(['FINANCIAL SUMMARY']);
    wsData.push([
      'Wallet Advance Balance:', formatINR(walletBalance),
      '',
      'Total Invoiced:', formatINR(totalInvoiced),
      '',
      'Total Collected:', formatINR(totalPaid),
      '',
      'Total Outstanding Due:', formatINR(pendingBalance)
    ]);
    wsData.push([]);

    // -------------------------------------------------------------
    // Exact Mandated Table Columns
    // -------------------------------------------------------------
    wsData.push([
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
    ]);

    // Populate data rows grouped by invoice
    invoices.forEach((inv: any) => {
      const invPayments = payments.filter((p: any) => p.invoice_id === inv.id);
      const grandTotal = Number(inv.grand_total || 0);

      if (invPayments.length > 0) {
        // Sort chronologically ascending
        invPayments.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        let runningPaid = 0;

        invPayments.forEach((p: any) => {
          const amt = Number(p.amount || 0);
          runningPaid += amt;
          const leftAfter = Math.max(0, grandTotal - runningPaid);
          const isFull = leftAfter <= 0;

          wsData.push([
            customer.name,
            inv.invoice_code || '—',
            inv.jobs?.job_code || 'Direct Sale',
            grandTotal,
            formatDateIST(p.created_at),
            amt,
            p.payment_method || '—',
            p.reference_number || '—',
            leftAfter,
            isFull ? 'Paid' : 'Partial'
          ]);
        });
      } else {
        const storedPaid = Number(inv.amount_paid || 0);
        if (storedPaid > 0) {
          // Historical pre-ledger invoice
          const leftAfter = Math.max(0, grandTotal - storedPaid);
          wsData.push([
            customer.name,
            inv.invoice_code || '—',
            inv.jobs?.job_code || 'Direct Sale',
            grandTotal,
            formatDateIST(inv.created_at),
            storedPaid,
            inv.payment_method || 'Historical Record',
            '—',
            leftAfter,
            'Historical — pre-ledger'
          ]);
        } else {
          // Unpaid invoice
          wsData.push([
            customer.name,
            inv.invoice_code || '—',
            inv.jobs?.job_code || 'Direct Sale',
            grandTotal,
            '—',
            0,
            '—',
            '—',
            grandTotal,
            'Pending'
          ]);
        }
      }
    });

    // Create workbook and sheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 22 }, // Customer
      { wch: 18 }, // Invoice #
      { wch: 16 }, // Job #
      { wch: 15 }, // Total Amount
      { wch: 15 }, // Payment Date
      { wch: 26 }, // Amount Paid (this installment)
      { wch: 18 }, // Payment Method
      { wch: 20 }, // Reference #
      { wch: 28 }, // Amount Left After This Payment
      { wch: 22 }  // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer_Ledger');

    const base64Data = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
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
