import type { Workbook, Worksheet, Cell, Borders, Fill } from 'exceljs';

export interface CustomerLedgerExportData {
  customer: {
    name: string;
    phone?: string | null;
    email?: string | null;
    gstin?: string | null;
    address?: string | null;
  };
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    pendingBalance: number;
    walletBalance: number;
  };
  groupedLedger: Array<{
    invoiceId?: string;
    invoiceCode?: string;
    jobCode?: string;
    totalAmount?: number;
    invoice?: any;
    rows: Array<{
      rowId?: string | null;
      customerName: string;
      invoiceCode: string;
      jobCode: string;
      totalAmount: number;
      paymentDate: string | null;
      amountPaid: number;
      paymentMethod: string;
      referenceNumber: string | null;
      amountLeftAfterPayment: number;
      status: string;
      isHistorical?: boolean;
      notes?: string | null;
    }>;
  }>;
}

const BRAND_NAVY = 'FF14337A';
const BRAND_ACCENT = 'FF1E56CC';
const BG_LIGHT_ROW = 'FFF8FAFC';
const BG_WHITE = 'FFFFFFFF';
const BG_CARD_LABEL = 'FFF1F5F9';
const BORDER_COLOR = 'FFE2E8F0';
const BORDER_DARK = 'FFCBD5E1';

const thinBorder: Partial<Borders> = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } },
};

const headerBorder: Partial<Borders> = {
  top: { style: 'thin', color: { argb: BRAND_NAVY } },
  bottom: { style: 'medium', color: { argb: BRAND_NAVY } },
  left: { style: 'thin', color: { argb: 'FF2A4E9E' } },
  right: { style: 'thin', color: { argb: 'FF2A4E9E' } },
};

function applyBoxBorder(ws: Worksheet, startRow: number, startCol: number, endRow: number, endCol: number) {
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
}

export async function buildCustomerLedgerWorkbook(data: CustomerLedgerExportData): Promise<Workbook> {
  // Dynamically import exceljs to ensure smooth browser bundle compatibility
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
  const wb: Workbook = new ExcelJS.Workbook();
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
    views: [
      { state: 'frozen', xSplit: 0, ySplit: 13 }
    ]
  });

  // Column definitions with comfortable, deliberate widths
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

  // -------------------------------------------------------------
  // Row 1: Statement Title
  // -------------------------------------------------------------
  ws.mergeCells('A1:J1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'Digital Solution — Customer Ledger Statement';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_NAVY } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 36;

  // -------------------------------------------------------------
  // Row 2: Metadata
  // -------------------------------------------------------------
  ws.mergeCells('A2:J2');
  const metaCell = ws.getCell('A2');
  const nowStr = new Date().toLocaleString('en-IN', {
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

  // Row 3: Spacing
  ws.getRow(3).height = 10;

  // -------------------------------------------------------------
  // Row 4: Section Header — CUSTOMER DETAILS
  // -------------------------------------------------------------
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
  ws.getCell('B5').value = data.customer.name;
  ws.getCell('B5').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  ws.getCell('B5').alignment = { vertical: 'middle', horizontal: 'left' };

  ws.getCell('E5').value = 'Contact Phone:';
  ws.getCell('E5').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
  ws.getCell('E5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_CARD_LABEL } };
  ws.getCell('E5').alignment = { vertical: 'middle', horizontal: 'left' };

  ws.mergeCells('F5:J5');
  ws.getCell('F5').value = data.customer.phone || '—';
  ws.getCell('F5').font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
  ws.getCell('F5').alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(5).height = 22;

  // Row 6: Email & GSTIN
  ws.getCell('A6').value = 'Email Address:';
  ws.getCell('A6').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
  ws.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_CARD_LABEL } };
  ws.getCell('A6').alignment = { vertical: 'middle', horizontal: 'left' };

  ws.mergeCells('B6:D6');
  ws.getCell('B6').value = data.customer.email || '—';
  ws.getCell('B6').font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
  ws.getCell('B6').alignment = { vertical: 'middle', horizontal: 'left' };

  ws.getCell('E6').value = 'GSTIN:';
  ws.getCell('E6').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
  ws.getCell('E6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_CARD_LABEL } };
  ws.getCell('E6').alignment = { vertical: 'middle', horizontal: 'left' };

  ws.mergeCells('F6:J6');
  ws.getCell('F6').value = data.customer.gstin || '—';
  ws.getCell('F6').font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
  ws.getCell('F6').alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(6).height = 22;

  // Row 7: Address
  ws.getCell('A7').value = 'Address:';
  ws.getCell('A7').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
  ws.getCell('A7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_CARD_LABEL } };
  ws.getCell('A7').alignment = { vertical: 'top', horizontal: 'left' };

  ws.mergeCells('B7:J7');
  ws.getCell('B7').value = data.customer.address || 'No address on file';
  ws.getCell('B7').font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
  ws.getCell('B7').alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  ws.getRow(7).height = 26;

  // Borders for Customer Details box
  applyBoxBorder(ws, 5, 1, 7, 10);

  // Row 8: Spacing
  ws.getRow(8).height = 10;

  // -------------------------------------------------------------
  // Row 9: Section Header — FINANCIAL SUMMARY
  // -------------------------------------------------------------
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
  const pendingBal = Number(data.summary.pendingBalance || 0);

  ws.mergeCells('A11:B11');
  const cWallet = ws.getCell('A11');
  cWallet.value = Number(data.summary.walletBalance || 0);
  cWallet.numFmt = '"₹"#,##0.00';
  cWallet.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0284C7' } };
  cWallet.alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('C11:D11');
  const cInvoiced = ws.getCell('C11');
  cInvoiced.value = Number(data.summary.totalInvoiced || 0);
  cInvoiced.numFmt = '"₹"#,##0.00';
  cInvoiced.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  cInvoiced.alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('E11:G11');
  const cPaid = ws.getCell('E11');
  cPaid.value = Number(data.summary.totalPaid || 0);
  cPaid.numFmt = '"₹"#,##0.00';
  cPaid.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF059669' } };
  cPaid.alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('H11:J11');
  const cPending = ws.getCell('H11');
  cPending.value = pendingBal;
  cPending.numFmt = '"₹"#,##0.00';
  cPending.alignment = { vertical: 'middle', horizontal: 'center' };

  if (pendingBal > 0) {
    cPending.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFDC2626' } };
    cPending.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  } else {
    cPending.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF059669' } };
    cPending.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  }

  ws.getRow(11).height = 28;

  // Apply card border boxes for Financial Summary
  applyBoxBorder(ws, 10, 1, 11, 2);
  applyBoxBorder(ws, 10, 3, 11, 4);
  applyBoxBorder(ws, 10, 5, 11, 7);
  applyBoxBorder(ws, 10, 8, 11, 10);

  // Row 12: Spacing
  ws.getRow(12).height = 12;

  // -------------------------------------------------------------
  // Row 13: Table Header Row (Mandated 10 Columns)
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // Data Rows (Row 14 onwards)
  // -------------------------------------------------------------
  let currentRowIdx = 14;

  data.groupedLedger.forEach(({ rows }) => {
    rows.forEach((row, rowIdx) => {
      const isEven = (currentRowIdx % 2 === 0);
      const rowBg = isEven ? BG_LIGHT_ROW : BG_WHITE;
      const isSettled = Number(row.amountLeftAfterPayment) <= 0 || row.status === 'paid';
      const isLastInGroup = rowIdx === rows.length - 1;

      const newRow = ws.getRow(currentRowIdx);
      newRow.height = 22;

      // Col A: Customer
      newRow.getCell(1).value = row.customerName;
      newRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

      // Col B: Invoice #
      newRow.getCell(2).value = row.invoiceCode;
      newRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
      if (isSettled && isLastInGroup) {
        newRow.getCell(2).font = { name: 'Arial', size: 10, bold: true };
      }

      // Col C: Job #
      newRow.getCell(3).value = row.jobCode;
      newRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };

      // Col D: Total Amount
      newRow.getCell(4).value = Number(row.totalAmount || 0);
      newRow.getCell(4).numFmt = '"₹"#,##0.00';
      newRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
      if (isSettled && isLastInGroup) {
        newRow.getCell(4).font = { name: 'Arial', size: 10, bold: true };
      }

      // Col E: Payment Date
      newRow.getCell(5).value = row.paymentDate ? row.paymentDate : '—';
      newRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

      // Col F: Amount Paid (this installment)
      newRow.getCell(6).value = Number(row.amountPaid || 0);
      newRow.getCell(6).numFmt = '"₹"#,##0.00';
      newRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };

      // Col G: Payment Method
      newRow.getCell(7).value = row.paymentMethod || '—';
      newRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };

      // Col H: Reference #
      newRow.getCell(8).value = row.referenceNumber || '—';
      newRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };

      // Col I: Amount Left After This Payment
      newRow.getCell(9).value = Number(row.amountLeftAfterPayment || 0);
      newRow.getCell(9).numFmt = '"₹"#,##0.00';
      newRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
      if (isSettled) {
        newRow.getCell(9).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF059669' } };
      }

      // Col J: Status
      const statusText = row.isHistorical
        ? 'Historical'
        : (row.status === 'paid' ? 'Paid' : row.status === 'partial' ? 'Partial' : 'Pending');

      newRow.getCell(10).value = statusText;
      newRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };

      // Apply row borders and zebra fill
      for (let c = 1; c <= 10; c++) {
        const cell = newRow.getCell(c);
        cell.border = thinBorder;
        if (c !== 10) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }
      }

      // Status pill styling
      const statusCell = newRow.getCell(10);
      if (statusText === 'Paid') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF065F46' } };
      } else if (statusText === 'Partial') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
      } else if (statusText === 'Historical') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        statusCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
      } else {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
      }

      currentRowIdx++;
    });
  });

  // -------------------------------------------------------------
  // Closing Footer Row
  // -------------------------------------------------------------
  const footerRowIdx = currentRowIdx;
  ws.getRow(footerRowIdx).height = 10; // small spacer

  const signoffRowIdx = footerRowIdx + 1;
  ws.mergeCells(`A${signoffRowIdx}:J${signoffRowIdx}`);
  const footerCell = ws.getCell(`A${signoffRowIdx}`);
  footerCell.value = 'Digital Solution — Internal Management System • Certified Customer Statement';
  footerCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
  footerCell.border = { top: { style: 'thin', color: { argb: BORDER_DARK } } };
  ws.getRow(signoffRowIdx).height = 24;

  return wb;
}
