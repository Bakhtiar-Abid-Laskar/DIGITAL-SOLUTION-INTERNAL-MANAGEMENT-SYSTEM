-- 1. Users Table: Allow authenticated users to read other users (needed for the Technician dropdown)
CREATE POLICY "Authenticated users can read active users"
ON users FOR SELECT TO authenticated
USING (true);

-- 2. Jobs Table: Allow authenticated users to read and insert jobs
CREATE POLICY "Authenticated users can read jobs"
ON jobs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Receptionists can insert jobs"
ON jobs FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Receptionists can update jobs"
ON jobs FOR UPDATE TO authenticated
USING (true);

-- 3. Job Materials: Allow authenticated users to read materials for job details
CREATE POLICY "Authenticated users can read job materials"
ON job_materials FOR SELECT TO authenticated
USING (true);
