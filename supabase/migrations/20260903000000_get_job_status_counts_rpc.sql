-- Migration: get_job_status_counts_rpc
-- Replaces 7 parallel count queries on /jobs with a single high-performance aggregation RPC

CREATE OR REPLACE FUNCTION get_job_status_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', count(*),
    'counts', coalesce(
      (
        SELECT jsonb_object_agg(status, count)
        FROM (
          SELECT status, count(*) AS count
          FROM jobs
          GROUP BY status
        ) s
      ),
      '{}'::jsonb
    )
  )
  INTO result
  FROM jobs;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_job_status_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_status_counts() TO anon;
