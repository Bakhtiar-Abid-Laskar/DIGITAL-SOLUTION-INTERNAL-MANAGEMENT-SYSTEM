export interface MaterialExportRow {
  id: string;
  material_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  technician_name?: string;
  job_code?: string;
  customer_name?: string;
}

export const exportMaterialsToCSV = (materials: MaterialExportRow[]) => {
  const headers = [
    'Material ID',
    'Material Name',
    'Quantity',
    'Unit Cost (₹)',
    'Total Cost (₹)',
    'Technician Name',
    'Job Code',
    'Customer Name',
    'Allotted Date & Time',
  ];

  const rows = materials.map((m) => [
    `"${m.id}"`,
    `"${m.material_name.replace(/"/g, '""')}"`,
    m.quantity,
    m.unit_cost,
    m.total_cost || m.quantity * m.unit_cost,
    `"${(m.technician_name || 'Unassigned').replace(/"/g, '""')}"`,
    `"${(m.job_code || '').replace(/"/g, '""')}"`,
    `"${(m.customer_name || '').replace(/"/g, '""')}"`,
    `"${new Date(m.created_at).toLocaleString('en-IN')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', `repairshop_allotted_materials_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
