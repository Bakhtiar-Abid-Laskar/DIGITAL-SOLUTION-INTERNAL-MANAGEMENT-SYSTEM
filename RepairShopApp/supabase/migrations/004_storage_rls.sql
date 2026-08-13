CREATE POLICY "Users can upload their own selfies"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attendance-selfies');

CREATE POLICY "Users can view their own selfies"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attendance-selfies');
