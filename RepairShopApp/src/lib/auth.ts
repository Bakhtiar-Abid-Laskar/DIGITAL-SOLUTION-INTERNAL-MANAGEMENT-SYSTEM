import { supabase } from './supabase';

export type UserRole = 'admin' | 'receptionist' | 'technician';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string | null;
}

export const fetchUserRow = async (userId: string): Promise<UserRow | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, is_active, last_login_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user row:', error.message);
    return null;
  }
  return data as UserRow;
};
