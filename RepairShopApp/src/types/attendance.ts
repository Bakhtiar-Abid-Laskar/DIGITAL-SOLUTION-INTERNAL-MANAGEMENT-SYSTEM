export type AttendanceStatus = 'Present' | 'Halfday' | 'Leave' | 'Absent';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_drive_file_id: string | null;
  check_out_drive_file_id: string | null;
  gps_lat?: number | null;
  check_in_gps_lat: number | null;
  gps_lng: number | null;
  check_out_gps_lat: number | null;
  check_out_gps_lng: number | null;
  status: AttendanceStatus;
}
