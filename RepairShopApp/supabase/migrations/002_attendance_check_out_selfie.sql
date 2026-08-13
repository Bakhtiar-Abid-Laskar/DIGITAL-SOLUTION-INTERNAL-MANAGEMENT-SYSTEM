alter table attendance
add column if not exists check_in_selfie_url text,
add column if not exists check_out_selfie_url text,
add column if not exists check_out_gps_lat numeric,
add column if not exists check_out_gps_lng numeric;
