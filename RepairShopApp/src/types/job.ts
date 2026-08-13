export type JobStatus = 'Received' | 'In Progress' | 'Waiting for Materials' | 'Completed';
export type JobPriority = 'Normal' | 'High' | 'Urgent';
export type JobType = 'Inhouse' | 'Onsite';
export type DeviceType = 'Laptop' | 'PC' | 'Other';

export interface Job {
  id: string;
  job_code: string;
  customer_name: string;
  customer_contact: string;
  customer_email: string | null;
  customer_gstin?: string | null;
  device_type: DeviceType;
  reported_issue: string;
  remarks: string | null;
  work_notes: string | null;
  job_type: JobType; // Inhouse | Onsite
  job_type_ref_id?: string | null;
  snap_technician_incentive?: number;
  priority: JobPriority;
  status: JobStatus;
  receptionist_id: string | null;
  technician_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface JobMaterial {
  id: string;
  job_id: string;
  material_name: string;
  quantity: number;
  qty_taken?: number | null;
  unit_cost: number;
  total_cost: number;
  photo_url?: string | null;
  checkout_status?: 'checked_out' | 'confirmed';
  usage_confirmed_at?: string | null;
}

export interface NewJobFormValues {
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  customer_gstin?: string;
  device_type: DeviceType;
  reported_issue: string;
  remarks: string;
  job_type: JobType; // Inhouse | Onsite
  job_type_ref_id?: string;
  job_type_title?: string;
  customer_charge_amount?: number;
  snap_technician_incentive?: number;
  priority: JobPriority;
  technician_id: string;
}
