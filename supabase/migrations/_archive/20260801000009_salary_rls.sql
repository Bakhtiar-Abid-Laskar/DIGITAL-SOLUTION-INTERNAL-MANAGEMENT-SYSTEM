-- Migration: 20260801000009_salary_rls
-- Description: Allow staff to read their own generated salary records

DROP POLICY IF EXISTS "Staff can view own salary" ON public.salary;
CREATE POLICY "Staff can view own salary" 
ON public.salary 
FOR SELECT 
USING (auth.uid() = user_id);

