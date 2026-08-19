// companyConfig.ts — Hardcoded company details for invoice rendering.
// Change any value here to update all generated invoices instantly.
// No DB query needed — these are stable business identity fields.

export const COMPANY = {
  name: 'Digital Solution',
  tagline: 'YOUR TRUSTED TECHNOLOGY PARTNER',
  address: 'Rangirkhari, Tarani Road, Silchar-788005, Cachar, Assam',
  phone: '7002204047 / 7002611748',
  email: 'digitalsolutionsilchar@gmail.com',
};

export const BANK = {
  name: 'Punjab National Bank',
  accountNo: '0313050408714',
  ifsc: 'PUNB0031320',
  upiId: 'digitalsolution@pnb',
};

export const TERMS =
  'Goods once sold will not be taken back. Warranty as per manufacturer policy. Service has no warranty.';
