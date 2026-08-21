export interface OnsiteVisit {
  id: string;
  job_id: string;
  technician_id: string;
  arrival_selfie_drive_file_id: string | null;
  device_before_drive_file_id: string | null;
  arrival_time: string | null;
  arrival_gps_lat: number | null;
  arrival_gps_lng: number | null;
  departure_selfie_drive_file_id: string | null;
  device_after_drive_file_id: string | null;
  departure_time: string | null;
  departure_gps_lat: number | null;
  departure_gps_lng: number | null;
  device_photo_drive_file_id?: string | null;
  jobs?: { job_code: string };
}
