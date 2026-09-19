// jobCardTemplate.ts — Operational Job Card HTML generator
// Provides a clean, standalone, zero-financial Job Card template
// used across Web Admin Panel and Mobile App.

export interface JobCardMaterialItem {
  name: string;
  quantity: number;
}

export interface JobCardCompanyInfo {
  name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export interface JobCardData {
  jobCode: string;
  createdAt: string;
  jobType?: string | null;
  priority?: string | null;
  status?: string | null;
  serviceTitle?: string | null;
  intakeStaffName?: string | null;
  technicianName?: string | null;

  customerName: string;
  customerContact: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;

  deviceType?: string | null;
  serialNumber?: string | null;
  reportedIssue: string;
  remarks?: string | null;
  workNotes?: string | null;

  materials?: JobCardMaterialItem[];
  company?: JobCardCompanyInfo;
  terms?: string[];
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(isoString);
  }
}

const DEFAULT_COMPANY: JobCardCompanyInfo = {
  name: 'RepairShop',
  tagline: 'SERVICE & REPAIR MANAGEMENT',
  address: 'Rangirkhari, Tarani Road, Silchar-788005, Cachar, Assam',
  phone: '+91 7002204047 / 7002611748',
  email: 'contact@repairshop.local',
};

const DEFAULT_TERMS: string[] = [
  'Data Backup: Customer is strictly advised to back up all data. RepairShop is not responsible for any data loss during diagnosis or repair.',
  'Inspection & Authorization: Initial estimates provided during intake are indicative. Any hidden or secondary faults detected upon internal hardware diagnosis will be notified for customer approval.',
  'Storage & Disposal: Devices not claimed or collected within 30 days of completion notice are subject to storage charges or disposal in accordance with workshop policy.',
  'Warranty Terms: Limited warranty applies solely to replaced hardware parts as per manufacturer or workshop warranty policy. No warranty on physical, burn, or liquid damages.',
];

/**
 * Generates high-contrast, clean, professional HTML for an operational Job Card.
 * Explicitly excludes all financial, pricing, and billing numbers.
 */
export function generateJobCardHtml(data: JobCardData): string {
  const company = { ...DEFAULT_COMPANY, ...(data.company || {}) };
  const terms = data.terms && data.terms.length > 0 ? data.terms : DEFAULT_TERMS;
  const materials = data.materials || [];

  const materialsRows = materials
    .map(
      (m, idx) => `
      <tr>
        <td style="text-align: center; width: 40px;">${idx + 1}</td>
        <td><strong>${escapeHtml(m.name)}</strong></td>
        <td style="text-align: center; width: 80px;">${escapeHtml(String(m.quantity))}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Card - ${escapeHtml(data.jobCode)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.4;
      color: #0f172a;
      background: #ffffff;
      padding: 16px;
    }
    .jobcard-container {
      max-width: 820px;
      margin: 0 auto;
      border: 1.5px solid #0f172a;
      background: #ffffff;
    }
    /* Header */
    .jc-header {
      padding: 16px 20px;
      border-bottom: 1.5px solid #0f172a;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #f8fafc;
    }
    .jc-brand h1 {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .jc-brand .tagline {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .jc-brand .contact-info {
      font-size: 10.5px;
      color: #334155;
      line-height: 1.4;
    }
    .jc-title-box {
      text-align: right;
    }
    .jc-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .jc-code {
      font-family: "Courier New", Courier, monospace;
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 1px;
    }
    .jc-date {
      font-size: 10px;
      color: #475569;
      margin-top: 2px;
    }

    /* Metadata Bar */
    .jc-meta-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      padding: 8px 16px;
      font-size: 10.5px;
    }
    .jc-meta-item {
      padding: 2px 6px;
    }
    .jc-meta-item .lbl {
      color: #64748b;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 1px;
    }
    .jc-meta-item .val {
      font-weight: 700;
      color: #0f172a;
    }

    /* Grid Sections */
    .jc-section-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid #cbd5e1;
    }
    .jc-section {
      padding: 12px 16px;
    }
    .jc-section:first-child {
      border-right: 1px solid #cbd5e1;
    }
    .jc-section-full {
      padding: 12px 16px;
      border-bottom: 1px solid #cbd5e1;
    }
    .jc-sec-header {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }

    /* Info Table Rows */
    .jc-data-table {
      width: 100%;
      border-collapse: collapse;
    }
    .jc-data-table td {
      padding: 3px 0;
      vertical-align: top;
      font-size: 11px;
    }
    .jc-data-table td.field-name {
      width: 110px;
      color: #475569;
      font-weight: 600;
    }
    .jc-data-table td.field-val {
      color: #0f172a;
      font-weight: 500;
    }

    /* Highlighted Problem Box */
    .jc-issue-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 10px 12px;
      margin-top: 6px;
      font-size: 11px;
      line-height: 1.5;
      color: #0f172a;
      white-space: pre-wrap;
      min-height: 52px;
    }
    .jc-remarks-box {
      background: #fff;
      border: 1px dashed #cbd5e1;
      border-radius: 4px;
      padding: 8px 12px;
      margin-top: 6px;
      font-size: 10.5px;
      line-height: 1.4;
      color: #334155;
    }

    /* Parts Table (Zero Financials) */
    .jc-parts-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 10.5px;
    }
    .jc-parts-table th, .jc-parts-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }
    .jc-parts-table th {
      background: #f1f5f9;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9.5px;
      color: #475569;
    }

    /* Terms */
    .jc-terms {
      padding: 10px 16px;
      background: #fafafa;
      border-bottom: 1px solid #cbd5e1;
      font-size: 9px;
      color: #475569;
      line-height: 1.4;
    }
    .jc-terms h4 {
      font-size: 9.5px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .jc-terms ol {
      padding-left: 16px;
      margin: 0;
    }
    .jc-terms li {
      margin-bottom: 3px;
    }

    /* Signatures */
    .jc-signatures {
      padding: 24px 20px 16px 20px;
      display: flex;
      justify-content: space-between;
      background: #ffffff;
    }
    .jc-sig-block {
      width: 44%;
      text-align: center;
    }
    .jc-sig-line {
      border-top: 1.5px solid #0f172a;
      margin-bottom: 6px;
    }
    .jc-sig-title {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
    }
    .jc-sig-sub {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
    }

    @media print {
      body {
        padding: 0;
      }
      .jobcard-container {
        border: 1.5px solid #000;
      }
    }
  </style>
</head>
<body>
  <div class="jobcard-container">
    
    <!-- 1. Header -->
    <div class="jc-header">
      <div class="jc-brand">
        <h1>${escapeHtml(company.name)}</h1>
        ${company.tagline ? `<div class="tagline">${escapeHtml(company.tagline)}</div>` : ''}
        <div class="contact-info">
          ${company.address ? `${escapeHtml(company.address)}<br>` : ''}
          ${company.phone ? `Phone: <strong>${escapeHtml(company.phone)}</strong> &bull; ` : ''}
          ${company.email ? `Email: ${escapeHtml(company.email)}` : ''}
        </div>
      </div>
      <div class="jc-title-box">
        <div class="jc-badge">JOB CARD / INTAKE</div>
        <div class="jc-code">${escapeHtml(data.jobCode)}</div>
        <div class="jc-date">Intake: ${escapeHtml(formatDate(data.createdAt))}</div>
      </div>
    </div>

    <!-- 2. Metadata Bar -->
    <div class="jc-meta-bar">
      <div class="jc-meta-item">
        <span class="lbl">Job Type</span>
        <span class="val">${escapeHtml(data.jobType || 'Inhouse')}</span>
      </div>
      <div class="jc-meta-item">
        <span class="lbl">Priority</span>
        <span class="val">${escapeHtml(data.priority || 'Normal')}</span>
      </div>
      <div class="jc-meta-item">
        <span class="lbl">Status</span>
        <span class="val">${escapeHtml(data.status || 'Received')}</span>
      </div>
      <div class="jc-meta-item">
        <span class="lbl">Intake Staff</span>
        <span class="val">${escapeHtml(data.intakeStaffName || '—')}</span>
      </div>
    </div>

    <!-- 3. Customer & Assigned Technician Row -->
    <div class="jc-section-row">
      <!-- Customer Information -->
      <div class="jc-section">
        <div class="jc-sec-header">
          <span>Customer Information</span>
        </div>
        <table class="jc-data-table">
          <tr>
            <td class="field-name">Customer Name:</td>
            <td class="field-val"><strong>${escapeHtml(data.customerName)}</strong></td>
          </tr>
          <tr>
            <td class="field-name">Contact Number:</td>
            <td class="field-val"><strong>${escapeHtml(data.customerContact)}</strong></td>
          </tr>
          <tr>
            <td class="field-name">Email:</td>
            <td class="field-val">${escapeHtml(data.customerEmail || '—')}</td>
          </tr>
          <tr>
            <td class="field-name">Address:</td>
            <td class="field-val">${escapeHtml(data.customerAddress || '—')}</td>
          </tr>
          ${data.customerGstin ? `
          <tr>
            <td class="field-name">GSTIN:</td>
            <td class="field-val font-mono">${escapeHtml(data.customerGstin)}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Workshop Assignment & Service -->
      <div class="jc-section">
        <div class="jc-sec-header">
          <span>Workshop Assignment</span>
        </div>
        <table class="jc-data-table">
          <tr>
            <td class="field-name">Assigned Tech:</td>
            <td class="field-val"><strong>${escapeHtml(data.technicianName || 'Unassigned')}</strong></td>
          </tr>
          ${data.serviceTitle ? `
          <tr>
            <td class="field-name">Service Category:</td>
            <td class="field-val">${escapeHtml(data.serviceTitle)}</td>
          </tr>` : ''}
          <tr>
            <td class="field-name">Intake Channel:</td>
            <td class="field-val">Direct Walk-in / Counter</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 4. Device Details & Reported Issue -->
    <div class="jc-section-full">
      <div class="jc-sec-header">
        <span>Device & Diagnostic Information</span>
      </div>
      <table class="jc-data-table" style="margin-bottom: 8px;">
        <tr>
          <td class="field-name" style="width: 130px;">Device Category:</td>
          <td class="field-val"><strong>${escapeHtml(data.deviceType || '—')}</strong></td>
        </tr>
      </table>

      <div style="margin-top: 6px;">
        <span style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Customer Reported Issue / Fault Description:</span>
        <div class="jc-issue-box">${escapeHtml(data.reportedIssue || 'None reported.')}</div>
      </div>

      ${data.remarks ? `
      <div style="margin-top: 8px;">
        <span style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Physical Condition & Accessories Received:</span>
        <div class="jc-remarks-box">${escapeHtml(data.remarks)}</div>
      </div>` : ''}
    </div>

    <!-- 5. Replaced / Allocated Parts (Technical Reference Only — No Pricing) -->
    ${materials.length > 0 ? `
    <div class="jc-section-full">
      <div class="jc-sec-header">
        <span>Allocated Technical Parts (Operational Reference — No Pricing)</span>
        <span style="font-size: 9px; color: #64748b; font-weight: normal;">${materials.length} item(s)</span>
      </div>
      <table class="jc-parts-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>Item Description</th>
            <th style="width: 80px; text-align: center;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${materialsRows}
        </tbody>
      </table>
    </div>` : ''}

    <!-- 6. Terms of Service -->
    <div class="jc-terms">
      <h4>Customer Intake Acknowledgement & Terms</h4>
      <ol>
        ${terms.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
      </ol>
    </div>

    <!-- 7. Signatures -->
    <div class="jc-signatures">
      <div class="jc-sig-block">
        <div class="jc-sig-line"></div>
        <div class="jc-sig-title">Customer Signature</div>
        <div class="jc-sig-sub">Accepted physical condition & intake terms</div>
      </div>
      <div class="jc-sig-block">
        <div class="jc-sig-line"></div>
        <div class="jc-sig-title">Authorized Workshop Signature</div>
        <div class="jc-sig-sub">${escapeHtml(company.name)}</div>
      </div>
    </div>

  </div>
</body>
</html>`;
}
