import { buildCustomerLedgerWorkbook, CustomerLedgerExportData } from './customerLedgerExcel';

describe('buildCustomerLedgerWorkbook', () => {
  const sampleData: CustomerLedgerExportData = {
    customer: {
      name: 'John Doe Enterprises',
      phone: '9876543210',
      email: 'john@example.com',
      address: '123 Main Road, Tech City, Assam - 788001',
      gstin: '18AABCU9603R1ZM',
    },
    summary: {
      walletBalance: 500,
      totalInvoiced: 15000,
      totalPaid: 12000,
      pendingBalance: 3000,
    },
    groupedLedger: [
      {
        invoiceId: 'inv-1',
        invoiceCode: 'INV-2026-001',
        jobCode: 'RS-2026-0001',
        totalAmount: 10000,
        rows: [
          {
            customerName: 'John Doe Enterprises',
            invoiceCode: 'INV-2026-001',
            jobCode: 'RS-2026-0001',
            totalAmount: 10000,
            paymentDate: '2026-09-01',
            amountPaid: 6000,
            paymentMethod: 'UPI',
            referenceNumber: 'UPI-987654',
            amountLeftAfterPayment: 4000,
            status: 'partial',
          },
          {
            customerName: 'John Doe Enterprises',
            invoiceCode: 'INV-2026-001',
            jobCode: 'RS-2026-0001',
            totalAmount: 10000,
            paymentDate: '2026-09-05',
            amountPaid: 4000,
            paymentMethod: 'Cash',
            referenceNumber: '-',
            amountLeftAfterPayment: 0,
            status: 'paid',
          },
        ],
      },
    ],
  };

  it('generates a workbook with Customer_Ledger worksheet', async () => {
    const workbook = await buildCustomerLedgerWorkbook(sampleData);
    const worksheet = workbook.getWorksheet('Customer_Ledger');
    expect(worksheet).toBeDefined();
  });

  it('configures title row with Digital Solution branding and navy fill', async () => {
    const workbook = await buildCustomerLedgerWorkbook(sampleData);
    const ws = workbook.getWorksheet('Customer_Ledger')!;
    const titleCell = ws.getCell('A1');

    expect(titleCell.value).toBe('Digital Solution — Customer Ledger Statement');
    expect(titleCell.font?.bold).toBe(true);
    expect(titleCell.font?.size).toBe(16);
    expect(titleCell.font?.color?.argb).toBe('FFFFFFFF');
    expect((titleCell.fill as any)?.fgColor?.argb).toBe('FF14337A');
  });

  it('configures freeze panes at table header (ySplit = 13)', async () => {
    const workbook = await buildCustomerLedgerWorkbook(sampleData);
    const ws = workbook.getWorksheet('Customer_Ledger')!;

    expect(ws.views).toBeDefined();
    expect(ws.views[0].state).toBe('frozen');
    expect((ws.views[0] as any).ySplit).toBe(13);
  });

  it('configures landscape page setup fitting one page wide', async () => {
    const workbook = await buildCustomerLedgerWorkbook(sampleData);
    const ws = workbook.getWorksheet('Customer_Ledger')!;

    expect(ws.pageSetup.orientation).toBe('landscape');
    expect(ws.pageSetup.fitToWidth).toBe(1);
    expect(ws.pageSetup.fitToHeight).toBe(0);
  });

  it('formats financial summary card cells with proper currency format and dues alert', async () => {
    const workbook = await buildCustomerLedgerWorkbook(sampleData);
    const ws = workbook.getWorksheet('Customer_Ledger')!;

    // Row 10 is labels, Row 11 is values
    const dueCell = ws.getCell('H11');
    expect(dueCell.value).toBe(3000);
    expect(dueCell.numFmt).toBe('"₹"#,##0.00');
    // pendingBalance > 0 should have red font
    expect(dueCell.font?.color?.argb).toBe('FFDC2626');
  });

  it('renders payment rows with alternating shading, currency formatting, and status pill colors', async () => {
    const workbook = await buildCustomerLedgerWorkbook(sampleData);
    const ws = workbook.getWorksheet('Customer_Ledger')!;

    // Header is row 13
    expect(ws.getCell('A13').value).toBe('Customer');
    expect(ws.getCell('B13').value).toBe('Invoice #');
    expect(ws.getCell('D13').value).toBe('Total Amount');

    // First payment row is row 14
    const row14 = ws.getRow(14);
    expect(row14.getCell(1).value).toBe('John Doe Enterprises');
    expect(row14.getCell(2).value).toBe('INV-2026-001');
    expect(row14.getCell(4).value).toBe(10000);
    expect(row14.getCell(4).numFmt).toBe('"₹"#,##0.00');
    expect(row14.getCell(10).value).toBe('Partial');
    // Partial status amber fill
    expect(((row14.getCell(10).fill as any)?.fgColor?.argb)).toBe('FFFEF3C7');

    // Second payment row is row 15 (settlement row)
    const row15 = ws.getRow(15);
    expect(row15.getCell(10).value).toBe('Paid');
    // Paid status green fill
    expect(((row15.getCell(10).fill as any)?.fgColor?.argb)).toBe('FFD1FAE5');
    // Settlement row should have bold Total Amount cell
    expect(row15.getCell(4).font?.bold).toBe(true);
  });

  it('appends a branded closing footer row after data', async () => {
    const workbook = await buildCustomerLedgerWorkbook(sampleData);
    const ws = workbook.getWorksheet('Customer_Ledger')!;

    // Last row is footer
    const lastRow = ws.getRow(ws.rowCount);
    expect(lastRow.getCell(1).value).toContain('Digital Solution');
  });

  it('exports a valid XLSX buffer without throwing', async () => {
    const workbook = await buildCustomerLedgerWorkbook(sampleData);
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
