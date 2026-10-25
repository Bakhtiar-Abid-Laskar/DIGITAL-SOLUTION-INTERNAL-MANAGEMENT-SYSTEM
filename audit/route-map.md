# Complete Route & Screen Map — RepairShopApp

Generated: 2026-10-25T20:49:28.436Z

## 1. Web Admin Panel Routes (`admin-panel`)

| Route Path | Type | Source File | Auth Required | Intended Roles | Role Guard Implementation | Data / Tables Touched |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- |
| `/attendance` | Page | `admin-panel/src/app/(admin)/attendance/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | attendance, users |
| `/customers` | Page | `admin-panel/src/app/(admin)/customers/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | customers, jobs, invoices |
| `/expenditure` | Page | `admin-panel/src/app/(admin)/expenditure/page.tsx` | Yes | Admin only | Explicit page-level check + Layout guard | payments |
| `/inventory` | Page | `admin-panel/src/app/(admin)/inventory/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | inventory, products |
| `/job-types` | Page | `admin-panel/src/app/(admin)/job-types/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | job_types |
| `/jobs/new` | Page | `admin-panel/src/app/(admin)/jobs/new/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | users, job_types, ui_device_types |
| `/jobs` | Page | `admin-panel/src/app/(admin)/jobs/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | jobs, users |
| `/jobs/[id]` | Page | `admin-panel/src/app/(admin)/jobs/[id]/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | jobs, job_materials, invoices |
| `/materials` | Page | `admin-panel/src/app/(admin)/materials/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | material_allotments, job_materials, notifications |
| `/` | Page | `admin-panel/src/app/(admin)/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | material_allotments, job_materials, jobs |
| `/pending-payments` | Page | `admin-panel/src/app/(admin)/pending-payments/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | invoices |
| `/reports` | Page | `admin-panel/src/app/(admin)/reports/page.tsx` | Yes | Admin intended | ⚠️ UI hidden in Sidebar ONLY (Missing page guard) | jobs, invoices, export_jobs_latest |
| `/salary` | Page | `admin-panel/src/app/(admin)/salary/page.tsx` | Yes | Admin only | Explicit page-level check + Layout guard | users |
| `/sales/new` | Page | `admin-panel/src/app/(admin)/sales/new/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | inventory |
| `/sales` | Page | `admin-panel/src/app/(admin)/sales/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | invoices, invoice_items |
| `/sales/[id]` | Page | `admin-panel/src/app/(admin)/sales/[id]/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | invoices |
| `/settings/geofence` | Page | `admin-panel/src/app/(admin)/settings/geofence/page.tsx` | Yes | Admin intended | ⚠️ UI hidden in Sidebar ONLY (Missing page guard) | geofence_settings |
| `/settings` | Page | `admin-panel/src/app/(admin)/settings/page.tsx` | Yes | Admin intended | ⚠️ UI hidden in Sidebar ONLY (Missing page guard) | users |
| `/settings/whatsapp` | Page | `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx` | Yes | Admin intended | ⚠️ UI hidden in Sidebar ONLY (Missing page guard) | whatsapp_settings, whatsapp_logs |
| `/staff/leaves` | Page | `admin-panel/src/app/(admin)/staff/leaves/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | employee_leave |
| `/staff` | Page | `admin-panel/src/app/(admin)/staff/page.tsx` | Yes | Admin, Receptionist | Layout guard (`AdminLayout`) | users |
| `/api/test` | API route | `admin-panel/src/app/api/test/route.ts` | Varies | Varies | API route handler check | - |
| `/login` | Page | `admin-panel/src/app/login/page.tsx` | No | Public / Unauthenticated | Public page | users |
| `/reset-password` | Page | `admin-panel/src/app/reset-password/page.tsx` | No | Public / Unauthenticated | Public page | - |

## 2. Mobile App Navigation & Screens (`RepairShopApp`)

| Screen Name | Role Folder | Source File | Registered Navigators | Allowed Roles | Guards | Data Touched |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `AdminCreateStaffScreen` | `admin` | `RepairShopApp/src/screens/admin/AdminCreateStaffScreen.tsx` | AdminStack / AdminTabs | Admin only | Navigation stack isolation | - |
| `AdminJobDetailScreen` | `admin` | `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx` | AdminStack / AdminTabs | Admin only | Navigation stack isolation | jobs, job_technicians, job_materials |
| `AdminJobsScreen` | `admin` | `RepairShopApp/src/screens/admin/AdminJobsScreen.tsx` | AdminStack / AdminTabs | Admin only | Navigation stack isolation | jobs |
| `ExpenditureScreen` | `admin` | `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx` | AdminStack / AdminTabs | Admin only | Navigation stack isolation | payments |
| `OverviewScreen` | `admin` | `RepairShopApp/src/screens/admin/OverviewScreen.tsx` | AdminStack / AdminTabs | Admin only | Navigation stack isolation | notifications, jobs, invoices |
| `PurchaseIntakeScreen` | `admin` | `RepairShopApp/src/screens/admin/PurchaseIntakeScreen.tsx` | AdminStack / AdminTabs | Admin only | Navigation stack isolation | - |
| `ReportsScreen` | `admin` | `RepairShopApp/src/screens/admin/ReportsScreen.tsx` | AdminStack / AdminTabs | Admin only | Navigation stack isolation | jobs, invoices, sales |
| `SalaryScreen` | `admin` | `RepairShopApp/src/screens/admin/SalaryScreen.tsx` | AdminStack / AdminTabs | Admin only | Navigation stack isolation | users |
| `StaffAttendanceOverviewScreen` | `admin` | `RepairShopApp/src/screens/admin/StaffAttendanceOverviewScreen.tsx` | AdminStack / AdminTabs | Admin only | Navigation stack isolation | users, attendance |
| `StaffScreen` | `admin` | `RepairShopApp/src/screens/admin/StaffScreen.tsx` | AdminStack / AdminTabs | Admin only | Navigation stack isolation | users, attendance |
| `LoginScreen` | `auth` | `RepairShopApp/src/screens/auth/LoginScreen.tsx` | AuthStack | Unauthenticated | Navigation stack isolation | users |
| `ResetPasswordScreen` | `auth` | `RepairShopApp/src/screens/auth/ResetPasswordScreen.tsx` | AuthStack | Unauthenticated | Navigation stack isolation | - |
| `AnalyticsScreen` | `receptionist` | `RepairShopApp/src/screens/receptionist/AnalyticsScreen.tsx` | ReceptionistTabs / ReceptionistStack | Receptionist only | Navigation stack isolation | jobs |
| `BillingScreen` | `receptionist` | `RepairShopApp/src/screens/receptionist/BillingScreen.tsx` | ReceptionistTabs / ReceptionistStack | Receptionist only | Navigation stack isolation | jobs, job_materials, invoices |
| `CustomerIntakeScreen` | `receptionist` | `RepairShopApp/src/screens/receptionist/CustomerIntakeScreen.tsx` | ReceptionistTabs / ReceptionistStack | Receptionist only | Navigation stack isolation | job_types, ui_device_types |
| `CustomersScreen` | `receptionist` | `RepairShopApp/src/screens/receptionist/CustomersScreen.tsx` | ReceptionistTabs / ReceptionistStack | Receptionist only | Navigation stack isolation | jobs, sales |
| `DashboardScreen` | `receptionist` | `RepairShopApp/src/screens/receptionist/DashboardScreen.tsx` | ReceptionistTabs / ReceptionistStack | Receptionist only | Navigation stack isolation | notifications, jobs |
| `JobAssignmentScreen` | `receptionist` | `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx` | ReceptionistTabs / ReceptionistStack | Receptionist only | Navigation stack isolation | jobs, job_technicians |
| `JobDetailScreen` | `receptionist` | `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx` | ReceptionistTabs / ReceptionistStack | Receptionist only | Navigation stack isolation | jobs, job_technicians, job_materials |
| `JobListScreen` | `receptionist` | `RepairShopApp/src/screens/receptionist/JobListScreen.tsx` | ReceptionistTabs / ReceptionistStack | Receptionist only | Navigation stack isolation | jobs |
| `NewSaleScreen` | `receptionist` | `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx` | ReceptionistTabs / ReceptionistStack | Receptionist only | Navigation stack isolation | inventory |
| `AllottedMaterialsScreen` | `shared` | `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | material_allotments |
| `AttendanceScreen` | `shared` | `RepairShopApp/src/screens/shared/AttendanceScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | attendance, geofence_settings, employee_leave |
| `InactiveUserScreen` | `shared` | `RepairShopApp/src/screens/shared/InactiveUserScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | - |
| `InventoryScreen` | `shared` | `RepairShopApp/src/screens/shared/InventoryScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | inventory, products |
| `LoadingScreen` | `shared` | `RepairShopApp/src/screens/shared/LoadingScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | - |
| `NotificationsScreen` | `shared` | `RepairShopApp/src/screens/shared/NotificationsScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | notifications |
| `PendingPaymentsScreen` | `shared` | `RepairShopApp/src/screens/shared/PendingPaymentsScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | invoices |
| `ProfileScreen` | `shared` | `RepairShopApp/src/screens/shared/ProfileScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | users |
| `SalaryScreen` | `shared` | `RepairShopApp/src/screens/shared/SalaryScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | staff_rates, salary, employee_leave |
| `SaleDetailScreen` | `shared` | `RepairShopApp/src/screens/shared/SaleDetailScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | invoices |
| `SalesListScreen` | `shared` | `RepairShopApp/src/screens/shared/SalesListScreen.tsx` | AdminTabs, ReceptionistTabs, TechnicianTabs | Shared (Role-based tabs) | Navigation stack isolation | invoice_items, invoices |
| `AllottedMaterialsScreen` | `technician` | `RepairShopApp/src/screens/technician/AllottedMaterialsScreen.tsx` | TechnicianTabs / TechnicianStack | Technician only | Navigation stack isolation | material_allotments |
| `MyJobsScreen` | `technician` | `RepairShopApp/src/screens/technician/MyJobsScreen.tsx` | TechnicianTabs / TechnicianStack | Technician only | Navigation stack isolation | notifications, jobs |
| `OnsiteVisitScreen` | `technician` | `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx` | TechnicianTabs / TechnicianStack | Technician only | Navigation stack isolation | jobs, job_technicians, onsite_visits |
| `TechnicianDashboardScreen` | `technician` | `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx` | TechnicianTabs / TechnicianStack | Technician only | Navigation stack isolation | notifications, jobs |
| `TechnicianReportsScreen` | `technician` | `RepairShopApp/src/screens/technician/TechnicianReportsScreen.tsx` | TechnicianTabs / TechnicianStack | Technician only | Navigation stack isolation | jobs, onsite_visits, job_materials |
| `UpdateWorkScreen` | `technician` | `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx` | TechnicianTabs / TechnicianStack | Technician only | Navigation stack isolation | job_types, jobs, job_technicians |
