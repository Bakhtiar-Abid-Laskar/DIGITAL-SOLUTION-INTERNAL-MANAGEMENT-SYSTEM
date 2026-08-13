import { Sale } from '@/types/sales';

export const exportSalesToCSV = (sales: Sale[]) => {
  const headers = [
    'Sale Code',
    'Customer Name',
    'Customer Contact',
    'Status',
    'Payment Method',
    'Subtotal',
    'Discount',
    'Tax Percent',
    'Total Amount',
    'Created By',
    'Created At',
    'Paid At'
  ];

  const rows = sales.map((sale) => [
    sale.sale_code,
    `"${sale.customer_name}"`,
    `"${sale.customer_contact}"`,
    sale.status,
    sale.payment_method,
    sale.subtotal,
    sale.discount,
    sale.tax_percent,
    sale.total_amount,
    `"${sale.created_by_user?.name || 'Unknown'}"`,
    new Date(sale.created_at).toLocaleString(),
    sale.paid_at ? new Date(sale.paid_at).toLocaleString() : ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `repairshop_sales_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
