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
