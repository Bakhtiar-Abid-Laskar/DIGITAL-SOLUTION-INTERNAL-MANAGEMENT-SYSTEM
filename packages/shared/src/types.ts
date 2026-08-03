export type Role = 'admin' | 'receptionist' | 'technician';
export type JobStatus = 'Received' | 'In Progress' | 'Waiting for Materials' | 'Completed';
export type JobPriority = 'Normal' | 'High' | 'Urgent';
export type JobType = 'Inhouse' | 'Onsite';
export type AttendanceStatus = 'Present' | 'Halfday' | 'Leave' | 'Absent';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  is_active: boolean;
  expo_push_token?: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  job_code: string;
  customer_name: string;
  customer_contact: string;
  customer_email?: string | null;
  customer_gstin?: string | null;
  device_type: 'Laptop' | 'PC' | 'Other';
  reported_issue: string;
  remarks?: string | null;
  work_notes?: string | null;
  job_type: JobType;
  priority: JobPriority;
  status: JobStatus;
  receptionist_id?: string | null;
  technician_id?: string | null;
  created_at: string;
  completed_at?: string | null;
  technician?: { name: string } | null;
}

export interface JobMaterial {
  id: string;
  job_id: string;
  material_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  selfie_url?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  ot_hours: number;
  early_hours: number;
  status: AttendanceStatus;
  approved_by?: string | null;
}

export interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  cost_price: number;
  unit?: string | null;
  low_stock_threshold: number;
  last_updated: string;
}

export interface JobTypeCatalogItem {
  id: string;
  title: string;
  customer_charge_amount: number;
  technician_incentive: number;
  is_active: boolean;
  created_at?: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  is_recurring: boolean;
  created_at?: string;
}

export interface CustomerReview {
  id: string;
  user_id: string;
  job_id?: string | null;
  score: number;
  comments?: string | null;
  created_at: string;
}
