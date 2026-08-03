# ROUTE ANALYSIS
## Navigation flow

### Mobile Routes
- `ReceptionistStack` / `TechnicianStack` -> `Attendance` Tab
  - Protected by AuthContext. Uses unified `AttendanceScreen`.
- `ReceptionistStack` / `TechnicianStack` -> `Salary` Tab
  - Displays historical `salary` rows where `user_id = auth.uid()`.

### Admin Routes (Web)
- `/attendance`
  - Protected by Next.js layout guard. Requires admin role.
- `/salary`
  - Accesses `salary`, `payments`, and `staff_rates`.
- `/staff`
  - Modifies `users` and `staff_rates`.
