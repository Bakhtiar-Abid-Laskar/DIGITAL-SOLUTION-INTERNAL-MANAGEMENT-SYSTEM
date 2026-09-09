-- Migration: 20260909101500_onsite_arrival_checkin_rpc.sql
-- Description: Atomic RPC for onsite arrival check-in and job status transition

CREATE OR REPLACE FUNCTION public.record_onsite_arrival_checkin(
  p_job_id uuid,
  p_technician_id uuid,
  p_drive_file_id text,
  p_drive_link text,
  p_gps_lat numeric,
  p_gps_lng numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit_id uuid;
  v_existing_id uuid;
  v_timestamp timestamptz := now();
BEGIN
  -- Check for existing visit record for this job and technician
  SELECT id INTO v_existing_id
  FROM public.onsite_visits
  WHERE job_id = p_job_id 
    AND technician_id = p_technician_id
  ORDER BY arrival_time DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.onsite_visits
    SET arrival_time = v_timestamp,
        arrival_selfie_drive_file_id = p_drive_file_id,
        arrival_photo_drive_link = p_drive_link,
        arrival_gps_lat = p_gps_lat,
        arrival_gps_lng = p_gps_lng
    WHERE id = v_existing_id
    RETURNING id INTO v_visit_id;
  ELSE
    INSERT INTO public.onsite_visits (
      job_id,
      technician_id,
      arrival_time,
      arrival_selfie_drive_file_id,
      arrival_photo_drive_link,
      arrival_gps_lat,
      arrival_gps_lng
    ) VALUES (
      p_job_id,
      p_technician_id,
      v_timestamp,
      p_drive_file_id,
      p_drive_link,
      p_gps_lat,
      p_gps_lng
    )
    RETURNING id INTO v_visit_id;
  END IF;

  -- Atomically transition job to 'In Progress' if currently 'Received'
  UPDATE public.jobs
  SET status = 'In Progress'
  WHERE id = p_job_id AND status = 'Received';

  RETURN jsonb_build_object(
    'success', true,
    'visit_id', v_visit_id,
    'arrival_time', v_timestamp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_onsite_arrival_checkin(uuid, uuid, text, text, numeric, numeric) TO authenticated;
