/**
 * attendanceReport.ts — Shared Deno helper for per-staff attendance workbooks.
 *
 * Builds a single-sheet .xlsx for one staff member's attendance in a given month.
 * Reuses the same attendance column structure that calculate-monthly-salary uses,
 * so the two never disagree on how hours/status are derived.
 */

// @ts-ignore
import * as XLSX from 'npm:xlsx@0.18.5';

const PAGE_SIZE = 500;

/** Safely format a timestamptz for display in IST */
function fmtTime(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZone: 'Asia/Kolkata',
    });
  } catch { return value ?? '—'; }
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch { return value ?? '—'; }
}

/**
 * Build a per-staff attendance .xlsx for a given year+month.
 *
 * @param supabase   - Supabase client (service role)
 * @param userId     - Staff member's UUID
 * @param staffName  - Staff member's display name (used in sheet header)
 * @param year       - 4-digit year
 * @param month      - 1-indexed month
 * @returns          - Uint8Array of the .xlsx binary
 */
export async function buildStaffAttendanceWorkbook(
  supabase: any,
  userId: string,
  staffName: string,
  year: number,
  month: number
): Promise<Uint8Array> {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const startDate = `${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  // Fetch all attendance rows for this staff member in the month
  const rows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        date,
        check_in_time,
        check_out_time,
        gps_lat,
        gps_lng,
        check_out_gps_lat,
        check_out_gps_lng,
        ot_hours,
        early_hours,
        late_in_minutes,
        early_in_minutes,
        late_out_minutes,
        status,
        checkin_photo_drive_link,
        checkout_photo_drive_link
      `)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Attendance query failed for ${userId}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Compute hours worked for each row
  const sheetData = rows.map(r => {
    let hoursWorked = '—';
    if (r.check_in_time && r.check_out_time) {
      const diff = (new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime()) / 3600000;
      hoursWorked = diff.toFixed(2);
    }

    // Format GPS coordinates
    const gpsIn = r.gps_lat && r.gps_lng
      ? `${Number(r.gps_lat).toFixed(5)}, ${Number(r.gps_lng).toFixed(5)}`
      : '—';
    const gpsOut = r.check_out_gps_lat && r.check_out_gps_lng
      ? `${Number(r.check_out_gps_lat).toFixed(5)}, ${Number(r.check_out_gps_lng).toFixed(5)}`
      : '—';

    return {
      'Date': fmtDate(r.date),
      'Status': r.status ?? '—',
      'Check-In Time': fmtTime(r.check_in_time),
      'Check-Out Time': fmtTime(r.check_out_time),
      'Hours Worked': hoursWorked,
      'Check-In GPS (lat, lng)': gpsIn,
      'Check-Out GPS (lat, lng)': gpsOut,
      'OT Hours': r.ot_hours ?? 0,
      'Early-Leave Hours': r.early_hours ?? 0,
      'Late In (mins)': r.late_in_minutes ?? 0,
      'Early In (mins)': r.early_in_minutes ?? 0,
      'Late Out (mins)': r.late_out_minutes ?? 0,
      'Check-In Photo': r.checkin_photo_drive_link ?? '',
      'Check-Out Photo': r.checkout_photo_drive_link ?? '',
    };
  });

  // Summary header row (prepended above the data)
  const ws = XLSX.utils.aoa_to_sheet([
    [`Attendance Report — ${staffName}`],
    [`Month: ${new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`],
    [`Total Days in Month: ${lastDay}`, `Records in Report: ${rows.length}`],
    [], // spacer
  ]);

  XLSX.utils.sheet_add_json(ws, sheetData, { origin: 'A5', skipHeader: false });

  // Style column widths roughly
  ws['!cols'] = [
    { wch: 22 }, // Date
    { wch: 12 }, // Status
    { wch: 16 }, // Check-In Time
    { wch: 16 }, // Check-Out Time
    { wch: 14 }, // Hours Worked
    { wch: 28 }, // Check-In GPS
    { wch: 28 }, // Check-Out GPS
    { wch: 10 }, // OT Hours
    { wch: 16 }, // Early-Leave Hours
    { wch: 14 }, // Late In
    { wch: 14 }, // Early In
    { wch: 14 }, // Late Out
    { wch: 50 }, // Check-In Photo
    { wch: 50 }, // Check-Out Photo
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  const buffer: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}
