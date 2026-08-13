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
  const headers = [
    "Staff Name",
    "Role",
    "Date",
    "Status",
    "Check In Time",
    "Check Out Time",
    "At Location",
    "Review Status",
    "GPS Lat",
    "GPS Lng"
  ];

  const rows = records.map(record => [
    `"${record.users?.name || ''}"`,
    record.users?.role || '',
    record.date,
    record.status,
    record.check_in_time ? new Date(record.check_in_time).toLocaleString() : '',
    record.check_out_time ? new Date(record.check_out_time).toLocaleString() : '',
    record.at_location ? 'Yes' : 'No',
    record.review_status || '',
    record.gps_lat || '',
    record.gps_lng || ''
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename || `repairshop_attendance_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
