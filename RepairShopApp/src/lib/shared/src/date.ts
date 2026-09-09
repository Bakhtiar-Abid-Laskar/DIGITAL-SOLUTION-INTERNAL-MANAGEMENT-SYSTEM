export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const formatDateShort = (isoString: string | null | undefined) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export function formatMonthLabel(monthStr: string): string {
  const d = new Date(monthStr + (monthStr.length === 7 ? '-01' : ''));
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const getTodayDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function getAttendanceDateIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export function getStartOfTodayIST(): string {
  const istDateStr = getAttendanceDateIST();
  return new Date(`${istDateStr}T00:00:00.000+05:30`).toISOString();
}

export function getDateIST(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export const formatTime = (isoString: string | null) => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Formats an ISO date string into a smart, human-friendly relative time
 * (e.g. "Just now", "2m ago", "1h ago", "Yesterday, 04:30 PM", "22 Aug, 10:15 AM")
 */
export function formatRelativeTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // If time is slightly in the future or under 15 seconds ago
  if (diffMs < 15000) return 'Just now';

  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s ago`;

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  if (diffHours < 24) {
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return diffHours === 1 ? '1h ago' : `${diffHours}h ago`;
    }
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeStr}`;
  }

  // Check if current calendar year
  const isSameYear = date.getFullYear() === now.getFullYear();
  if (isSameYear) {
    const monthDay = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    return `${monthDay}, ${timeStr}`;
  }

  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${timeStr}`;
}

/**
 * Formats date into detailed timestamp for tooltips and audits (e.g. "22 Aug 2026, 10:30:15 AM")
 */
export function formatFullDateTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

