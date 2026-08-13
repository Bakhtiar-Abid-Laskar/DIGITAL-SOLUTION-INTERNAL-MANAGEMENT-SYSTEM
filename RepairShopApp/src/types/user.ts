export type UserRole = 'admin' | 'receptionist' | 'technician';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  expo_push_token: string | null;
  created_at: string;
}

export interface TechnicianSummary {
  id: string;
  name: string;
  phone: string | null;
  email: string;
}
