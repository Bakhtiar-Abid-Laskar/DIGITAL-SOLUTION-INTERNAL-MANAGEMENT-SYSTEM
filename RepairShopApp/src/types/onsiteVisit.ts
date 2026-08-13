export interface OnsiteVisit {
  id: string;
  job_id: string;
  technician_id: string;
  arrival_selfie_url: string | null;
  device_before_url: string | null;
  arrival_time: string | null;
  arrival_gps_lat: number | null;
  arrival_gps_lng: number | null;
  departure_selfie_url: string | null;
  device_after_url: string | null;
  departure_time: string | null;
  departure_gps_lat: number | null;
  departure_gps_lng: number | null;
}
