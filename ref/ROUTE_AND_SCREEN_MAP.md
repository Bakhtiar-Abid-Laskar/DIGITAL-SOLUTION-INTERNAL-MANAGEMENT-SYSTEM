# Route and Screen Map

## Mobile App Routes

### Auth Routes
- **LoginScreen** (`src/screens/auth/LoginScreen.tsx`)
  - Main purpose: User authentication.
  - Roles: All
  - Navigation destination: Routes based on user role (ReceptionistTabs, TechTabs, AdminTabs, InactiveUser).

### Shared Routes
- **AttendanceScreen** (`src/screens/shared/AttendanceScreen.tsx`)
  - Main purpose: Staff check-in/out.
  - Roles: Admin, Receptionist, Technician
  - Tables modified: `attendance`
  - Status: Active

- **InactiveUserScreen** (`src/screens/shared/InactiveUserScreen.tsx`)
  - Main purpose: Show pending approval state.
  - Roles: Inactive users
  - Status: Active

### Receptionist Routes
- **DashboardScreen** (`src/screens/receptionist/DashboardScreen.tsx`)
  - Main purpose: Receptionist overview.
  - Roles: Receptionist
  - Status: Active
- **NewJobScreen** (`src/screens/receptionist/NewJobScreen.tsx`)
  - Main purpose: Intake form.
  - Roles: Receptionist
  - Status: Active
- **JobListScreen** (`src/screens/receptionist/JobListScreen.tsx`)
  - Main purpose: View all jobs.
  - Roles: Receptionist
  - Status: Active
- **JobDetailScreen** (`src/screens/receptionist/JobDetailScreen.tsx`)
  - Main purpose: View job details, navigate to billing.
  - Roles: Receptionist
  - Status: Active
- **BillingScreen** (`src/screens/receptionist/BillingScreen.tsx`)
  - Main purpose: Invoice generation.
  - Roles: Receptionist
  - Status: Active

### Technician Routes
- **MyJobsScreen** (`src/screens/technician/MyJobsScreen.tsx`)
  - Main purpose: View assigned jobs.
  - Roles: Technician
  - Status: Active
- **TechJobDetailScreen** (`src/screens/technician/TechJobDetailScreen.tsx`)
  - Main purpose: Update status, add materials, log onsite visit.
  - Roles: Technician
  - Status: Active

## Admin Panel Routes (Next.js)

### Auth
- **Login** (`src/app/login/page.tsx`)
  - Main purpose: Admin login.
  - Roles: Admin

### Admin Layout Routes
- **Overview** (`src/app/(admin)/page.tsx`)
  - Main purpose: Metrics and charts.
  - Roles: Admin
- **Jobs** (`src/app/(admin)/jobs/page.tsx`)
  - Main purpose: Full job management.
  - Roles: Admin
- **Staff** (`src/app/(admin)/staff/page.tsx`)
  - Main purpose: User management.
  - Roles: Admin
- **Inventory** (`src/app/(admin)/inventory/page.tsx`)
  - Main purpose: Material tracking.
  - Roles: Admin
- **Reports** (`src/app/(admin)/reports/page.tsx`)
  - Main purpose: Analytics.
  - Roles: Admin
- **Salary** (`src/app/(admin)/salary/page.tsx`)
  - Main purpose: Payroll calculation.
  - Roles: Admin
- **Expenditure** (`src/app/(admin)/expenditure/page.tsx`)
  - Main purpose: Expense tracking.
  - Roles: Admin
- **Settings** (`src/app/(admin)/settings/page.tsx`)
  - Main purpose: System settings.
  - Roles: Admin

## Issues Identified
- No dead routes found.
- Role isolation is correctly enforced via navigation guards (RootNavigator.tsx / Next.js middleware).
