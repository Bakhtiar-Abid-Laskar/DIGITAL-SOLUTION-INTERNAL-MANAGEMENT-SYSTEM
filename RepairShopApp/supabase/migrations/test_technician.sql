-- Option 1: Quick Dummy Technician (For testing New Job screen only)
-- Note: Nobody can log in with this account because it doesn't exist in Supabase Auth.
INSERT INTO users (id, name, email, phone, role, is_active)
VALUES (
  gen_random_uuid(), 
  'Test Technician', 
  'tech@repairshop.local', 
  '+919876543210', 
  'technician', 
  true
);

-- ==========================================

-- Option 2: Real Technician (Can actually log in)
-- 1. Go to your Supabase Dashboard -> Authentication -> Add User
-- 2. Create a user (e.g., tech@yourdomain.com)
-- 3. Copy their new "User UID" from the dashboard
-- 4. Replace 'PASTE_UUID_HERE' below with that UID and run this:

/*
INSERT INTO users (id, name, email, phone, role, is_active)
VALUES (
  'PASTE_UUID_HERE', 
  'Real Technician', 
  'tech@yourdomain.com', 
  '+919876543210', 
  'technician', 
  true
);
*/
