export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonthLabel(monthStr: string): string {
  // monthStr can be "YYYY-MM" or "YYYY-MM-01"
  const d = new Date(monthStr + (monthStr.length === 7 ? '-01' : ''));
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
