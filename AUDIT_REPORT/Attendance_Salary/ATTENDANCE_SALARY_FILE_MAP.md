# FILE MAP
## Codebase Inventory

### Mobile App (RepairShopApp)
- `src/screens/shared/AttendanceScreen.tsx`
  - **Purpose**: Unified check-in/out screen for Receptionists and Technicians.
  - **Uses**: Expo Camera, Expo Location, Supabase Storage.
- `src/screens/shared/SalaryScreen.tsx`
  - **Purpose**: Mobile view for staff to see their own generated payslips.
  - **Uses**: Supabase `salary` table read-only access.

### Admin Panel
- `src/app/(admin)/attendance/page.tsx`
  - **Purpose**: Admin dashboard to view all staff attendance, filter by date.
- `src/app/(admin)/salary/page.tsx`
  - **Purpose**: Salary generation dashboard.
- `src/components/salary/SalaryCalculatorForm.tsx`
  - **Purpose**: Form to trigger the Edge Function for salary generation.
- `src/utils/salarySlipHtml.ts`
  - **Purpose**: Generates printable PDF payslips.

### Backend (Supabase)
- `supabase/migrations/*_redesign_salary_system.sql`
  - **Purpose**: Defines `staff_rates`, `salary`, and `payments` tables.
- `supabase/functions/calculate-monthly-salary/index.ts`
  - **Purpose**: Secure Deno function computing complex net pay formulas.
