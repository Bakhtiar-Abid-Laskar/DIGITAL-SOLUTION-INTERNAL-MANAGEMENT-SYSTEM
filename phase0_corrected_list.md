# Phase 0 — Corrected Occurrence List

### react-doctor/js-combine-iterations (5)
- `supabase/functions/_shared/exportWorkbook.ts:41`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:149`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:228`
- `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:398`
- `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:372`

### react-doctor/async-await-in-loop (3)
- `supabase/functions/export-attendance-reports/index.ts:152`
- `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:164`
- `supabase/functions/notify-on-status-change/index.ts:71`

### react-doctor/no-fetch-response-used-without-status-check (4)
- `supabase/functions/send-invoice-email/index.ts:123`
- `RepairShopApp/src/components/shared/SelfieCapture.tsx:112`
- `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:175`
- `supabase/functions/_shared/expoPush.ts:3`

### react-doctor/supabase-rls-policy-risk (3)
- `supabase/migrations/20260728000006_fix_sales_schema_and_rpc.sql:182`
- `supabase/migrations/006_phase3_rls.sql:11`
- `supabase/migrations/008_phase4_rls.sql:2`

### react-doctor/no-loading-flag-reset-outside-finally (31)
- `admin-panel/src/app/(admin)/expenditure/page.tsx:66`
- `admin-panel/src/app/(admin)/inventory/page.tsx:71`
- `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:102`
- `admin-panel/src/app/(admin)/jobs/page.tsx:117`
- `admin-panel/src/app/(admin)/reports/page.tsx:129`
- `admin-panel/src/app/(admin)/reports/page.tsx:156`
- `admin-panel/src/app/(admin)/reports/page.tsx:164`
- `admin-panel/src/app/(admin)/reports/page.tsx:208`
- `admin-panel/src/app/(admin)/sales/page.tsx:108`
- `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:86`
- `admin-panel/src/app/(admin)/staff/page.tsx:66`
- `admin-panel/src/app/login/page.tsx:38`
- `admin-panel/src/components/expenditure/ExpenditureForm.tsx:46`
- `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx:39`
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:46`
- `admin-panel/src/components/salary/BonusForm.tsx:46`
- `admin-panel/src/components/salary/HolidayCalendarForm.tsx:30`
- `admin-panel/src/components/salary/HolidayCalendarForm.tsx:53`
- `admin-panel/src/components/salary/LeaveManagement.tsx:57`
- `admin-panel/src/components/salary/LeaveManagement.tsx:117`
- `admin-panel/src/components/salary/StaffRateForm.tsx:64`
- `admin-panel/src/components/salary/StaffRateForm.tsx:106`
- `admin-panel/src/context/AuthContext.tsx:50`
- `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:35`
- `admin-panel/src/context/AuthContext.tsx:93`
- `RepairShopApp/src/screens/auth/LoginScreen.tsx:57`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:418`
- `RepairShopApp/src/screens/shared/SalaryScreen.tsx:299`
- `RepairShopApp/src/screens/shared/SalaryScreen.tsx:317`
- `RepairShopApp/src/screens/shared/SalaryScreen.tsx:331`
- `RepairShopApp/src/screens/shared/SalaryScreen.tsx:395`

### react-doctor/exhaustive-deps (37)
- `admin-panel/src/app/(admin)/expenditure/page.tsx:67`
- `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:124`
- `admin-panel/src/app/(admin)/jobs/page.tsx:159`
- `admin-panel/src/app/(admin)/page.tsx:156`
- `admin-panel/src/app/(admin)/reports/page.tsx:70`
- `admin-panel/src/app/(admin)/reports/page.tsx:97`
- `admin-panel/src/app/(admin)/reports/page.tsx:217`
- `admin-panel/src/app/(admin)/staff/leaves/page.tsx:42`
- `admin-panel/src/app/(admin)/staff/page.tsx:81`
- `admin-panel/src/components/layout/Topbar.tsx:100`
- `RepairShopApp/src/components/common/BottomSheet.tsx:64`
- `RepairShopApp/src/components/common/ModalShell.tsx:32`
- `RepairShopApp/src/components/common/SkeletonCard.tsx:24`
- `admin-panel/src/components/common/Toast.tsx:46`
- `RepairShopApp/src/components/jobs/PriorityBadge.tsx:45`
- `RepairShopApp/src/hooks/usePushNotifications.ts:175`
- `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx:69`
- `RepairShopApp/src/screens/admin/AdminJobsScreen.tsx:121`
- `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:127`
- `RepairShopApp/src/screens/admin/OverviewScreen.tsx:117`
- `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:100`
- `RepairShopApp/src/screens/receptionist/DashboardScreen.tsx:105`
- `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx:72`
- `RepairShopApp/src/screens/receptionist/JobListScreen.tsx:130`
- `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx:107`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:82`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:149`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:174`
- `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:87`
- `RepairShopApp/src/screens/shared/ProfileScreen.tsx:109`
- `RepairShopApp/src/screens/shared/SalaryScreen.tsx:300`
- `RepairShopApp/src/screens/technician/AllottedMaterialsScreen.tsx:89`
- `RepairShopApp/src/screens/technician/MyJobsScreen.tsx:58`
- `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx:67`
- `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx:123`
- `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx:131`
- `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:105`

### react-doctor/no-create-object-url-without-revoke (6)
- `admin-panel/src/app/(admin)/expenditure/page.tsx:106`
- `admin-panel/src/app/(admin)/reports/page.tsx:250`
- `admin-panel/src/lib/invoiceClient.ts:71`
- `admin-panel/src/utils/csv.ts:36`
- `admin-panel/src/utils/materialsCsv.ts:40`
- `admin-panel/src/utils/salesCsv.ts:40`

### react-doctor/label-has-associated-control (98)
- `admin-panel/src/app/(admin)/expenditure/page.tsx:148`
- `admin-panel/src/app/(admin)/expenditure/page.tsx:152`
- `admin-panel/src/app/(admin)/expenditure/page.tsx:158`
- `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:547`
- `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:555`
- `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:563`
- `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:571`
- `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:641`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:264`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:277`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:289`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:299`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:319`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:365`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:377`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:389`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:408`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:419`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:431`
- `admin-panel/src/app/(admin)/materials/page.tsx:331`
- `admin-panel/src/app/(admin)/materials/page.tsx:346`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:335`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:339`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:343`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:347`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:361`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:468`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:475`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:485`
- `admin-panel/src/app/(admin)/sales/page.tsx:174`
- `admin-panel/src/app/(admin)/sales/page.tsx:187`
- `admin-panel/src/app/(admin)/sales/page.tsx:201`
- `admin-panel/src/app/(admin)/settings/page.tsx:65`
- `admin-panel/src/app/(admin)/settings/page.tsx:71`
- `admin-panel/src/app/(admin)/settings/page.tsx:76`
- `admin-panel/src/app/(admin)/settings/page.tsx:98`
- `admin-panel/src/app/(admin)/settings/page.tsx:102`
- `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:184`
- `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:188`
- `admin-panel/src/app/(admin)/staff/page.tsx:140`
- `admin-panel/src/app/(admin)/staff/page.tsx:152`
- `admin-panel/src/app/(admin)/staff/page.tsx:164`
- `admin-panel/src/app/login/page.tsx:67`
- `admin-panel/src/app/login/page.tsx:78`
- `admin-panel/src/components/catalog/JobTypeFormModal.tsx:104`
- `admin-panel/src/components/catalog/JobTypeFormModal.tsx:117`
- `admin-panel/src/components/catalog/JobTypeFormModal.tsx:132`
- `admin-panel/src/components/expenditure/ExpenditureForm.tsx:63`
- `admin-panel/src/components/expenditure/ExpenditureForm.tsx:70`
- `admin-panel/src/components/expenditure/ExpenditureForm.tsx:75`
- `admin-panel/src/components/expenditure/ExpenditureForm.tsx:81`
- `admin-panel/src/components/inventory/AddStockModal.tsx:76`
- `admin-panel/src/components/inventory/AddStockModal.tsx:85`
- `admin-panel/src/components/inventory/AddStockModal.tsx:94`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:167`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:178`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:187`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:199`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:207`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:220`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:224`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:228`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:239`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:248`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:262`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:285`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:293`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:303`
- `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx:66`
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:76`
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:83`
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:88`
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:94`
- `admin-panel/src/components/salary/BonusForm.tsx:70`
- `admin-panel/src/components/salary/BonusForm.tsx:77`
- `admin-panel/src/components/salary/BonusForm.tsx:85`
- `admin-panel/src/components/salary/BonusForm.tsx:91`
- `admin-panel/src/components/salary/BonusForm.tsx:99`
- `admin-panel/src/components/salary/HolidayCalendarForm.tsx:86`
- `admin-panel/src/components/salary/HolidayCalendarForm.tsx:91`
- `admin-panel/src/components/salary/LeaveManagement.tsx:151`
- `admin-panel/src/components/salary/LeaveManagement.tsx:158`
- `admin-panel/src/components/salary/LeaveManagement.tsx:163`
- `admin-panel/src/components/salary/SalaryCalculatorForm.tsx:66`
- `admin-panel/src/components/salary/SalaryCalculatorForm.tsx:74`
- `admin-panel/src/components/salary/StaffRateForm.tsx:120`
- `admin-panel/src/components/salary/StaffRateForm.tsx:143`
- `admin-panel/src/components/salary/StaffRateForm.tsx:149`
- `admin-panel/src/components/salary/StaffRateForm.tsx:157`
- `admin-panel/src/components/salary/StaffRateForm.tsx:164`
- `admin-panel/src/components/salary/StaffRateForm.tsx:173`
- `admin-panel/src/components/salary/StaffRateForm.tsx:179`
- `admin-panel/src/components/salary/StaffRateForm.tsx:187`
- `admin-panel/src/components/staff/AddStaffModal.tsx:134`
- `admin-panel/src/components/staff/AddStaffModal.tsx:145`
- `admin-panel/src/components/staff/AddStaffModal.tsx:156`
- `admin-panel/src/components/staff/AddStaffModal.tsx:167`
- `admin-panel/src/components/staff/AddStaffModal.tsx:180`

### react-doctor/no-set-state-after-await-in-effect (12)
- `admin-panel/src/app/(admin)/inventory/page.tsx:79`
- `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:106`
- `admin-panel/src/app/(admin)/jobs/page.tsx:144`
- `admin-panel/src/app/(admin)/reports/page.tsx:60`
- `admin-panel/src/app/(admin)/reports/page.tsx:211`
- `admin-panel/src/app/(admin)/sales/page.tsx:120`
- `admin-panel/src/app/(admin)/staff/page.tsx:74`
- `admin-panel/src/components/layout/Topbar.tsx:80`
- `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:17`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:80`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:144`
- `RepairShopApp/src/screens/shared/ProfileScreen.tsx:107`

### react-doctor/js-hoist-intl (9)
- `admin-panel/src/app/(admin)/inventory/page.tsx:203`
- `admin-panel/src/app/(admin)/inventory/page.tsx:206`
- `admin-panel/src/app/(admin)/page.tsx:187`
- `admin-panel/src/app/(admin)/sales/page.tsx:267`
- `RepairShopApp/src/lib/shared/formatCurrency.ts:11`
- `supabase/functions/_shared/formatCurrency.ts:6`
- `src/date.ts:35`
- `src/date.ts:45`
- `src/formatCurrency.ts:11`

### react-doctor/no-giant-component (16)
- `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:31`
- `admin-panel/src/app/(admin)/jobs/new/page.tsx:18`
- `admin-panel/src/app/(admin)/jobs/page.tsx:22`
- `admin-panel/src/app/(admin)/materials/page.tsx:64`
- `admin-panel/src/app/(admin)/page.tsx:22`
- `admin-panel/src/app/(admin)/reports/page.tsx:25`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:86`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:10`
- `RepairShopApp/src/components/materials/AddMaterialModal.tsx:29`
- `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:26`
- `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:73`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:29`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:39`
- `RepairShopApp/src/screens/shared/ProfileScreen.tsx:39`
- `RepairShopApp/src/screens/shared/SalaryScreen.tsx:227`
- `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:30`

### react-doctor/prefer-useReducer (12)
- `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:31`
- `admin-panel/src/components/expenditure/ExpenditureForm.tsx:20`
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:20`
- `admin-panel/src/components/salary/BonusForm.tsx:17`
- `admin-panel/src/components/salary/StaffRateForm.tsx:14`
- `RepairShopApp/src/components/materials/AddMaterialModal.tsx:29`
- `RepairShopApp/src/screens/admin/OverviewScreen.tsx:38`
- `RepairShopApp/src/screens/admin/ReportsScreen.tsx:40`
- `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:26`
- `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:73`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:39`
- `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:30`

### react-doctor/prefer-module-scope-pure-function (22)
- `admin-panel/src/app/(admin)/materials/page.tsx:168`
- `admin-panel/src/components/layout/NotificationsDropdown.tsx:33`
- `admin-panel/src/components/salary/LeaveManagement.tsx:128`
- `admin-panel/src/context/AuthContext.tsx:97`
- `RepairShopApp/src/components/jobs/JobCard.tsx:40`
- `RepairShopApp/src/components/shared/SelfieCapture.tsx:105`
- `RepairShopApp/src/hooks/useLocationPermission.ts:5`
- `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:167`
- `RepairShopApp/src/screens/admin/SalaryScreen.tsx:188`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:170`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:179`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:188`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:193`
- `RepairShopApp/src/screens/auth/LoginScreen.tsx:63`
- `RepairShopApp/src/screens/auth/LoginScreen.tsx:66`
- `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:103`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:135`
- `RepairShopApp/src/screens/shared/InactiveUserScreen.tsx:11`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:280`
- `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:152`
- `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:164`
- `RepairShopApp/src/screens/shared/SalaryScreen.tsx:407`

### react-doctor/no-array-index-as-key (5)
- `admin-panel/src/app/(admin)/page.tsx:280`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:383`
- `admin-panel/src/components/dashboard/JobsPieChart.tsx:23`
- `admin-panel/src/components/salary/BonusForm.tsx:87`
- `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:513`

### react-doctor/click-events-have-key-events (4)
- `admin-panel/src/app/(admin)/page.tsx:318`
- `admin-panel/src/app/(admin)/reports/page.tsx:393`
- `admin-panel/src/components/layout/NotificationsDropdown.tsx:78`
- `admin-panel/src/components/layout/Sidebar.tsx:35`

### react-doctor/prefer-module-scope-static-value (12)
- `admin-panel/src/app/(admin)/page.tsx:345`
- `admin-panel/src/app/(admin)/reports/page.tsx:260`
- `admin-panel/src/app/(admin)/salary/page.tsx:52`
- `admin-panel/src/components/common/Badge.tsx:12`
- `admin-panel/src/components/common/Button.tsx:16`
- `admin-panel/src/components/common/Button.tsx:24`
- `admin-panel/src/components/common/Toast.tsx:23`
- `admin-panel/src/components/common/Toast.tsx:29`
- `admin-panel/src/components/salary/BonusForm.tsx:55`
- `admin-panel/src/components/salary/LeaveManagement.tsx:120`
- `RepairShopApp/src/components/jobs/PriorityBadge.tsx:21`
- `RepairShopApp/src/components/jobs/StatusBadge.tsx:14`

### react-doctor/rerender-state-only-in-handlers (25)
- `admin-panel/src/app/(admin)/reports/page.tsx:57`
- `admin-panel/src/app/(admin)/salary/page.tsx:26`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:91`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:111`
- `admin-panel/src/app/(admin)/sales/new/page.tsx:115`
- `RepairShopApp/src/components/materials/AddMaterialModal.tsx:31`
- `RepairShopApp/src/components/materials/AddMaterialModal.tsx:32`
- `RepairShopApp/src/components/materials/AddMaterialModal.tsx:43`
- `RepairShopApp/src/components/materials/AddMaterialModal.tsx:103`
- `RepairShopApp/src/screens/admin/AdminJobsScreen.tsx:18`
- `RepairShopApp/src/screens/admin/SalaryScreen.tsx:81`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:46`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:47`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:48`
- `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:39`
- `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx:44`
- `RepairShopApp/src/screens/receptionist/JobListScreen.tsx:16`
- `RepairShopApp/src/screens/receptionist/JobListScreen.tsx:17`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:48`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:49`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:50`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:69`
- `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:36`
- `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx:30`
- `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:56`

### react-doctor/no-locale-format-in-render (3)
- `admin-panel/src/app/(admin)/reports/page.tsx:403`
- `admin-panel/src/app/(admin)/reports/page.tsx:553`
- `admin-panel/src/app/(admin)/reports/page.tsx:590`

### react-doctor/control-has-associated-label (23)
- `admin-panel/src/app/(admin)/sales/new/page.tsx:436`
- `admin-panel/src/components/catalog/JobTypeFormModal.tsx:88`
- `admin-panel/src/components/expenditure/ExpenditureForm.tsx:76`
- `admin-panel/src/components/inventory/AddStockModal.tsx:62`
- `admin-panel/src/components/inventory/InventoryFormModal.tsx:142`
- `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx:50`
- `admin-panel/src/components/jobs/detail/OverviewTab.tsx:62`
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:77`
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:89`
- `admin-panel/src/components/salary/BonusForm.tsx:71`
- `admin-panel/src/components/salary/BonusForm.tsx:86`
- `admin-panel/src/components/salary/BonusForm.tsx:92`
- `admin-panel/src/components/salary/HolidayCalendarForm.tsx:87`
- `admin-panel/src/components/salary/LeaveManagement.tsx:152`
- `admin-panel/src/components/salary/LeaveManagement.tsx:159`
- `admin-panel/src/components/salary/StaffRateForm.tsx:121`
- `admin-panel/src/components/staff/AddStaffModal.tsx:120`
- `admin-panel/src/components/staff/AddStaffModal.tsx:135`
- `admin-panel/src/components/staff/AddStaffModal.tsx:146`
- `admin-panel/src/components/staff/AddStaffModal.tsx:157`
- `admin-panel/src/components/staff/AddStaffModal.tsx:168`
- `admin-panel/src/components/staff/AddStaffModal.tsx:181`
- `admin-panel/src/components/staff/AttendanceModal.tsx:58`

### react-doctor/no-placeholder-only-field (16)
- `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:189`
- `admin-panel/src/components/expenditure/ExpenditureForm.tsx:71`
- `admin-panel/src/components/expenditure/ExpenditureForm.tsx:82`
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:84`
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:95`
- `admin-panel/src/components/salary/BonusForm.tsx:78`
- `admin-panel/src/components/salary/BonusForm.tsx:100`
- `admin-panel/src/components/salary/HolidayCalendarForm.tsx:92`
- `admin-panel/src/components/salary/LeaveManagement.tsx:164`
- `admin-panel/src/components/salary/StaffRateForm.tsx:144`
- `admin-panel/src/components/salary/StaffRateForm.tsx:150`
- `admin-panel/src/components/salary/StaffRateForm.tsx:158`
- `admin-panel/src/components/salary/StaffRateForm.tsx:165`
- `admin-panel/src/components/salary/StaffRateForm.tsx:174`
- `admin-panel/src/components/salary/StaffRateForm.tsx:180`
- `admin-panel/src/components/salary/StaffRateForm.tsx:188`

### react-doctor/prefer-html-dialog (2)
- `admin-panel/src/components/common/ConfirmationModal.tsx:77`
- `admin-panel/src/components/staff/AddStaffModal.tsx:113`

### react-doctor/prefer-dynamic-import (3)
- `admin-panel/src/components/dashboard/JobsPieChart.tsx:3`
- `admin-panel/src/components/dashboard/RevenueChart.tsx:3`
- `admin-panel/src/components/dashboard/TechPerformanceChart.tsx:3`

### react-doctor/rerender-lazy-state-init (4)
- `admin-panel/src/components/inventory/AddStockModal.tsx:18`
- `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:81`
- `RepairShopApp/src/screens/admin/ReportsScreen.tsx:44`
- `RepairShopApp/src/screens/admin/SalaryScreen.tsx:74`

### react-doctor/no-static-element-interactions (2)
- `admin-panel/src/components/layout/NotificationsDropdown.tsx:78`
- `admin-panel/src/components/layout/Sidebar.tsx:35`

### react-doctor/dangerous-html-sink (2)
- `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:61`
- `admin-panel/src/lib/invoiceClient.ts:77`

### react-doctor/no-async-event-handler-without-reentry-guard (2)
- `admin-panel/src/components/salary/SalaryBreakdownCard.tsx:43`
- `admin-panel/src/components/salary/SalaryCalculatorForm.tsx:33`

### react-doctor/nextjs-no-client-side-redirect (1)
- `admin-panel/src/context/AuthContext.tsx:52`

### react-doctor/effect-needs-cleanup (3)
- `admin-panel/src/context/AuthContext.tsx:102`
- `RepairShopApp/src/hooks/usePushNotifications.ts:103`
- `RepairShopApp/src/hooks/useRealtimeSubscription.ts:18`

### react-doctor/jsx-no-constructed-context-values (2)
- `admin-panel/src/context/AuthContext.tsx:127`
- `RepairShopApp/src/context/ToastContext.tsx:32`

### react-doctor/rn-prefer-pressable (44)
- `RepairShopApp/src/components/common/AppHeader.tsx:2`
- `RepairShopApp/src/components/common/BottomSheet.tsx:2`
- `RepairShopApp/src/components/common/DetailRow.tsx:2`
- `RepairShopApp/src/components/common/ErrorBoundary.tsx:2`
- `RepairShopApp/src/components/common/ErrorState.tsx:2`
- `RepairShopApp/src/components/common/Toast.tsx:2`
- `RepairShopApp/src/components/jobs/JobDetailShell.tsx:2`
- `RepairShopApp/src/components/jobs/JobList.tsx:8`
- `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:2`
- `RepairShopApp/src/components/materials/AddMaterialModal.tsx:2`
- `RepairShopApp/src/components/materials/AllottedMaterialsCard.tsx:2`
- `RepairShopApp/src/components/materials/MaterialList.tsx:2`
- `RepairShopApp/src/components/shared/Dropdown.tsx:3`
- `RepairShopApp/src/components/shared/LineItemTable.tsx:2`
- `RepairShopApp/src/components/shared/RoleDashboard.tsx:2`
- `RepairShopApp/src/components/shared/SegmentedControl.tsx:2`
- `RepairShopApp/src/components/shared/SelfieCapture.tsx:3`
- `RepairShopApp/src/navigation/AdminTabs.tsx:2`
- `RepairShopApp/src/navigation/CustomTabBar.tsx:2`
- `RepairShopApp/src/navigation/ReceptionistTabs.tsx:2`
- `RepairShopApp/src/screens/admin/AdminCreateStaffScreen.tsx:8`
- `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx:20`
- `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:7`
- `RepairShopApp/src/screens/admin/OverviewScreen.tsx:2`
- `RepairShopApp/src/screens/admin/ReportsScreen.tsx:2`
- `RepairShopApp/src/screens/admin/SalaryScreen.tsx:7`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:7`
- `RepairShopApp/src/screens/auth/LoginScreen.tsx:10`
- `RepairShopApp/src/screens/receptionist/AnalyticsScreen.tsx:2`
- `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:2`
- `RepairShopApp/src/screens/receptionist/CustomersScreen.tsx:2`
- `RepairShopApp/src/screens/receptionist/DashboardScreen.tsx:2`
- `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx:6`
- `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx:2`
- `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:8`
- `RepairShopApp/src/screens/receptionist/PaymentsScreen.tsx:2`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:3`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:7`
- `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:2`
- `RepairShopApp/src/screens/shared/ProfileScreen.tsx:7`
- `RepairShopApp/src/screens/shared/SalaryScreen.tsx:8`
- `RepairShopApp/src/screens/technician/AllottedMaterialsScreen.tsx:2`
- `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx:2`
- `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:2`

### react-doctor/rn-no-panresponder (1)
- `RepairShopApp/src/components/common/BottomSheet.tsx:2`

### react-doctor/rerender-lazy-ref-init (1)
- `RepairShopApp/src/components/common/BottomSheet.tsx:33`

### react-doctor/rn-reanimated-4-use-worklets-scheduler (4)
- `RepairShopApp/src/components/common/BottomSheet.tsx:43`
- `RepairShopApp/src/components/common/BottomSheet.tsx:60`
- `RepairShopApp/src/components/common/ModalShell.tsx:28`
- `RepairShopApp/src/components/common/Toast.tsx:51`

### react-doctor/no-adjust-state-on-prop-change (2)
- `RepairShopApp/src/components/common/BottomSheet.tsx:53`
- `RepairShopApp/src/components/common/ModalShell.tsx:21`

### react-doctor/rn-no-deprecated-modules (1)
- `RepairShopApp/src/components/common/ErrorBoundary.tsx:2`

### react-doctor/rn-no-scrollview-mapped-list (2)
- `RepairShopApp/src/components/jobs/JobList.tsx:117`
- `RepairShopApp/src/components/jobs/JobList.tsx:133`

### react-doctor/rn-no-inline-flatlist-renderitem (10)
- `RepairShopApp/src/components/jobs/JobList.tsx:180`
- `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:55`
- `RepairShopApp/src/components/shared/Dropdown.tsx:59`
- `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:225`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:229`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:317`
- `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx:244`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:339`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:355`
- `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:220`

### react-doctor/rn-list-callback-per-row (8)
- `RepairShopApp/src/components/jobs/JobList.tsx:184`
- `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:56`
- `RepairShopApp/src/components/shared/Dropdown.tsx:64`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:238`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:342`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:363`
- `RepairShopApp/src/screens/shared/InventoryScreen.tsx:373`
- `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:226`

### react-doctor/supabase-client-owned-authz-field (2)
- `RepairShopApp/src/hooks/usePushNotifications.ts:14`
- `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:27`

### react-doctor/rn-no-non-native-navigator (6)
- `RepairShopApp/src/navigation/AdminStack.tsx:2`
- `RepairShopApp/src/navigation/ReceptionistJobsStack.tsx:2`
- `RepairShopApp/src/navigation/ReceptionistStack.tsx:2`
- `RepairShopApp/src/navigation/RootNavigator.tsx:3`
- `RepairShopApp/src/navigation/TechnicianJobsStack.tsx:2`
- `RepairShopApp/src/navigation/TechnicianStack.tsx:2`

### react-doctor/rn-no-inline-object-in-list-item (12)
- `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:230`
- `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:231`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:249`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:250`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:255`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:256`
- `RepairShopApp/src/screens/admin/StaffScreen.tsx:326`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:351`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:352`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:355`
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:356`
- `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:229`

### react-doctor/js-flatmap-filter (1)
- `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx:70`

### react-doctor/rn-prefer-expo-image (2)
- `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:4`
- `RepairShopApp/src/screens/shared/ProfileScreen.tsx:9`

### react-doctor/supabase-table-missing-rls (11)
- `supabase/migrations/001_initial_schema.sql:1`
- `supabase/migrations/001_initial_schema.sql:12`
- `supabase/migrations/001_initial_schema.sql:44`
- `supabase/migrations/001_initial_schema.sql:53`
- `supabase/migrations/001_initial_schema.sql:69`
- `supabase/migrations/001_initial_schema.sql:83`
- `supabase/migrations/001_initial_schema.sql:92`
- `supabase/migrations/001_initial_schema.sql:105`
- `supabase/migrations/001_initial_schema.sql:115`
- `supabase/migrations/001_initial_schema.sql:122`
- `supabase/migrations/001_initial_schema.sql:141`

