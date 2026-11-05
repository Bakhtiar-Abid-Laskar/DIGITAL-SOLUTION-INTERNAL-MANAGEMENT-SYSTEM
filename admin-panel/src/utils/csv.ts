import { Job } from '@repairshop/shared';

export const exportJobsToCSV = (jobs: Job[]) => {
  const headers = [
    "Job Code",
    "Customer Name",
    "Customer Contact",
    "Device Type",
    "Technician",
    "Status",
    "Priority",
    "Job Type",
    "Created At",
    "Completed At"
  ];

  const rows = jobs.map(job => [
    job.job_code,
    `"${job.customer_name}"`,
    `"${job.customer_contact}"`,
    job.device_type,
    job.technician?.name || "Unassigned",
    job.status,
    job.priority,
    job.job_type,
    new Date(job.created_at).toLocaleString(),
    job.completed_at ? new Date(job.completed_at).toLocaleString() : ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `repairshop_jobs_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportAttendanceToCSV = (records: any[], filename?: string) => {
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const formatIST = (iso: string | null | undefined): string => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return String(iso);
    }
  };

  const headers = [
    "Staff Name",
    "Role",
    "Date (IST)",
    "Status",
    "Check In Time (IST)",
    "Check Out Time (IST)",
    "Hours Worked",
    "OT Hours",
    "Late (Mins)",
    "Location Verified",
    "Review Status",
    "Notes"
  ];

  const rows = records.map(record => {
    const staffName = record.users?.name || record.user?.name || record.staff_name || '';
    const staffRole = record.users?.role || record.user?.role || record.staff_role || '';
    
    let hoursWorked = '';
    if (record.check_in_time && record.check_out_time) {
      const diffMs = new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime();
      if (diffMs > 0) {
        hoursWorked = (diffMs / (1000 * 60 * 60)).toFixed(2);
      }
    }

    const locationVerified = record.at_location 
      ? 'Yes' 
      : record.low_accuracy 
      ? 'Low Accuracy GPS' 
      : (record.gps_lat ? 'Outside Geofence' : 'No GPS');

    const notes = record.approval_note || record.notes || (record.is_auto_marked ? 'Auto-marked by system' : '');

    return [
      escapeCsv(staffName),
      escapeCsv(staffRole),
      escapeCsv(record.date || ''),
      escapeCsv(record.status || ''),
      escapeCsv(formatIST(record.check_in_time)),
      escapeCsv(formatIST(record.check_out_time)),
      escapeCsv(hoursWorked),
      escapeCsv(record.ot_hours ?? ''),
      escapeCsv(record.late_in_minutes ?? ''),
      escapeCsv(locationVerified),
      escapeCsv(record.review_status || ''),
      escapeCsv(notes)
    ];
  });

  const csvContent = [
    headers.map(h => `"${h}"`).join(","),
    ...rows.map(r => r.join(","))
  ].join("\r\n");

  // Prepend UTF-8 BOM (\uFEFF) so Excel & Google Sheets display Indian IST dates and special characters properly
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const nowIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const downloadName = filename || `repairshop_attendance_${nowIST}.csv`;
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", downloadName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
