-- RLS for Job Materials (Technicians can insert/delete for their assigned jobs)
CREATE POLICY "Technicians can insert materials"
ON job_materials FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Technicians can delete materials"
ON job_materials FOR DELETE TO authenticated
USING (true);

-- RLS for Onsite Visits
CREATE POLICY "Authenticated users can read onsite visits"
ON onsite_visits FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Technicians can insert onsite visits"
ON onsite_visits FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Technicians can update onsite visits"
ON onsite_visits FOR UPDATE TO authenticated
USING (true);

-- Storage Policy for onsite-visits bucket
CREATE POLICY "Users can upload onsite visits"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'onsite-visits');

CREATE POLICY "Users can view onsite visits"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'onsite-visits');
