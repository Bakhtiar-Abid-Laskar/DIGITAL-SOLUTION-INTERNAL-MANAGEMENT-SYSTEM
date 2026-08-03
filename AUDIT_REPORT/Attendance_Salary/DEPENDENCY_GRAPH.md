# DEPENDENCY GRAPH

- `SalaryScreen` (Mobile) -> `supabase` client -> `salary` table.
- `AttendanceScreen` (Mobile) -> `expo-camera`, `expo-location` -> `supabase.storage` -> `attendance` table.
- Edge Function -> `https://esm.sh/@supabase/supabase-js` -> `attendance`, `staff_rates`, `payments`, `salary` tables.
