# Full Monorepo File Inventory

Generated: 2026-10-25T20:48:06.319Z | Total Source & Configuration Files: 441

| Path | Type | Platform | Module | Approx. Lines | Touches DB / APIs | Tests Exist |
| :--- | :---: | :---: | :---: | :---: | :--- | :---: |
| `RepairShopApp/app.json` | config | mobile | Common | 80 | - | Y |
| `RepairShopApp/package.json` | config | mobile | Common | 64 | - | Y |
| `RepairShopApp/src/components/billing/BillingFormCards.tsx` | component | mobile | Billing/Payments | 162 | - | N |
| `RepairShopApp/src/components/billing/ItemizedBillTable.tsx` | component | mobile | Billing/Payments | 539 | - | N |
| `RepairShopApp/src/components/billing/ItemizedBillTotals.tsx` | component | mobile | Billing/Payments | 162 | - | N |
| `RepairShopApp/src/components/billing/PaymentRecordingBox.tsx` | component | mobile | Billing/Payments | 407 | rpc:record_installment_payment | N |
| `RepairShopApp/src/components/common/AppHeader.tsx` | component | mobile | Common | 173 | - | N |
| `RepairShopApp/src/components/common/AppPressable.tsx` | component | mobile | Common | 20 | - | N |
| `RepairShopApp/src/components/common/BottomSheet.tsx` | component | mobile | Common | 156 | - | N |
| `RepairShopApp/src/components/common/Button.tsx` | component | mobile | Common | 124 | - | N |
| `RepairShopApp/src/components/common/CameraBarcodeScannerModalMobile.tsx` | component | mobile | Common | 288 | - | N |
| `RepairShopApp/src/components/common/DetailRow.tsx` | component | mobile | Common | 86 | - | N |
| `RepairShopApp/src/components/common/EmptyState.tsx` | component | mobile | Common | 131 | - | N |
| `RepairShopApp/src/components/common/ErrorBoundary.tsx` | component | mobile | Common | 106 | - | N |
| `RepairShopApp/src/components/common/ErrorState.tsx` | component | mobile | Common | 46 | - | N |
| `RepairShopApp/src/components/common/LoadingState.tsx` | component | mobile | Common | 32 | - | N |
| `RepairShopApp/src/components/common/ModalShell.tsx` | component | mobile | Common | 106 | - | N |
| `RepairShopApp/src/components/common/PdfProgressModal.tsx` | component | mobile | Common | 224 | - | N |
| `RepairShopApp/src/components/common/ScreenScrollView.tsx` | component | mobile | Common | 72 | - | N |
| `RepairShopApp/src/components/common/SectionLabel.tsx` | component | mobile | Common | 33 | - | N |
| `RepairShopApp/src/components/common/SkeletonCard.tsx` | component | mobile | Common | 98 | - | N |
| `RepairShopApp/src/components/common/Toast.tsx` | component | mobile | Common | 147 | - | N |
| `RepairShopApp/src/components/customers/CustomerLedgerView.tsx` | component | mobile | Customers | 1219 | invoices, invoice_payments, customer_wallet_transactions, rpc:deposit_customer_advance | N |
| `RepairShopApp/src/components/customers/CustomerTypeaheadMobile.tsx` | component | mobile | Customers | 315 | rpc:search_customers_v2 | N |
| `RepairShopApp/src/components/inventory/InventoryFormSheet.tsx` | component | mobile | Inventory/Stock | 272 | - | N |
| `RepairShopApp/src/components/inventory/InventoryRow.tsx` | component | mobile | Inventory/Stock | 130 | - | N |
| `RepairShopApp/src/components/inventory/ProductTypeaheadMobile.tsx` | component | mobile | Inventory/Stock | 295 | rpc:search_products_catalog | N |
| `RepairShopApp/src/components/inventory/PurchaseDetailModalMobile.tsx` | component | mobile | Inventory/Stock | 404 | - | N |
| `RepairShopApp/src/components/inventory/PurchaseIntakeModalMobile.tsx` | component | mobile | Inventory/Stock | 1119 | rpc:log_inventory_purchase | N |
| `RepairShopApp/src/components/inventory/SerialSelectionModalMobile.tsx` | component | mobile | Inventory/Stock | 556 | rpc:search_available_serials | N |
| `RepairShopApp/src/components/jobs/JobCard.tsx` | component | mobile | Jobs | 179 | - | N |
| `RepairShopApp/src/components/jobs/JobDetailShell.tsx` | component | mobile | Jobs | 221 | - | N |
| `RepairShopApp/src/components/jobs/JobList.tsx` | component | mobile | Jobs | 307 | - | N |
| `RepairShopApp/src/components/jobs/PriorityBadge.tsx` | component | mobile | Jobs | 85 | - | N |
| `RepairShopApp/src/components/jobs/StatusBadge.tsx` | component | mobile | Jobs | 76 | - | N |
| `RepairShopApp/src/components/jobs/TechnicianPicker.tsx` | component | mobile | Jobs | 144 | users | N |
| `RepairShopApp/src/components/materials/AddMaterialModal.tsx` | component | mobile | Materials | 251 | inventory, job_materials | N |
| `RepairShopApp/src/components/materials/AllottedMaterialsCard.tsx` | component | mobile | Materials | 246 | - | N |
| `RepairShopApp/src/components/materials/MaterialCameraView.tsx` | component | mobile | Materials | 48 | - | N |
| `RepairShopApp/src/components/materials/MaterialList.tsx` | component | mobile | Materials | 109 | - | N |
| `RepairShopApp/src/components/profile/PhotoPickerModal.tsx` | component | mobile | Common | 53 | - | N |
| `RepairShopApp/src/components/profile/ProfileInfoCard.tsx` | component | mobile | Common | 207 | - | N |
| `RepairShopApp/src/components/profile/ProfilePasswordCard.tsx` | component | mobile | Common | 79 | - | N |
| `RepairShopApp/src/components/salary/LeaveApplicationCard.tsx` | component | mobile | Salary/Payroll | 145 | - | N |
| `RepairShopApp/src/components/salary/LeaveHistoryList.tsx` | component | mobile | Salary/Payroll | 88 | - | N |
| `RepairShopApp/src/components/salary/SalaryAttendanceSummary.tsx` | component | mobile | Attendance | 94 | - | N |
| `RepairShopApp/src/components/salary/SalaryBreakdownCard.tsx` | component | mobile | Salary/Payroll | 141 | - | N |
| `RepairShopApp/src/components/salary/SalaryHeroCard.tsx` | component | mobile | Salary/Payroll | 143 | - | N |
| `RepairShopApp/src/components/salary/SalaryHistoryList.tsx` | component | mobile | Salary/Payroll | 138 | - | N |
| `RepairShopApp/src/components/salary/SalaryRatesCard.tsx` | component | mobile | Salary/Payroll | 79 | - | N |
| `RepairShopApp/src/components/sales/SaleCustomerForm.tsx` | component | mobile | Customers | 136 | - | N |
| `RepairShopApp/src/components/sales/SaleItemsList.tsx` | component | mobile | Sales | 197 | - | N |
| `RepairShopApp/src/components/sales/SalePaymentForm.tsx` | component | mobile | Sales | 378 | - | N |
| `RepairShopApp/src/components/sales/SaleSuccessCard.tsx` | component | mobile | Sales | 66 | - | N |
| `RepairShopApp/src/components/shared/CreatableDropdown.tsx` | component | mobile | Common | 268 | - | N |
| `RepairShopApp/src/components/shared/Dropdown.tsx` | component | mobile | Common | 222 | - | N |
| `RepairShopApp/src/components/shared/LineItemTable.tsx` | component | mobile | Common | 168 | - | N |
| `RepairShopApp/src/components/shared/RoleDashboard.tsx` | component | mobile | Common | 406 | - | N |
| `RepairShopApp/src/components/shared/SegmentedControl.tsx` | component | mobile | Common | 81 | - | N |
| `RepairShopApp/src/components/shared/SelfieCapture.tsx` | component | mobile | Common | 421 | - | N |
| `RepairShopApp/src/components/suppliers/SupplierTypeaheadMobile.tsx` | component | mobile | Common | 279 | rpc:search_suppliers | N |
| `RepairShopApp/src/components/work/ArrivalSelfieBanner.tsx` | component | mobile | Common | 89 | - | N |
| `RepairShopApp/src/components/work/CompletionSelfieBanner.tsx` | component | mobile | Common | 82 | - | N |
| `RepairShopApp/src/components/work/MaterialUsageModal.tsx` | component | mobile | Materials | 137 | - | N |
| `RepairShopApp/src/context/AppConfigContext.tsx` | context | mobile | Common | 128 | ui_job_statuses, ui_priorities, ui_service_locations, ui_payment_statuses | N |
| `RepairShopApp/src/context/AuthContext.tsx` | context | mobile | Auth/Staff | 221 | - | N |
| `RepairShopApp/src/context/PdfProgressContext.tsx` | context | mobile | Common | 101 | - | N |
| `RepairShopApp/src/context/ToastContext.tsx` | context | mobile | Common | 67 | - | N |
| `RepairShopApp/src/hooks/useBottomInsetPadding.ts` | hook | mobile | Common | 27 | - | N |
| `RepairShopApp/src/hooks/useCameraPermission.ts` | hook | mobile | Common | 35 | - | N |
| `RepairShopApp/src/hooks/useLocationPermission.ts` | hook | mobile | Common | 44 | - | N |
| `RepairShopApp/src/hooks/usePushNotifications.ts` | hook | mobile | Notifications | 326 | users | N |
| `RepairShopApp/src/hooks/useRealtimeSubscription.ts` | hook | mobile | Auth/Staff | 51 | - | N |
| `RepairShopApp/src/lib/auth.ts` | util | mobile | Auth/Staff | 29 | users | N |
| `RepairShopApp/src/lib/invoiceService.ts` | util | mobile | Billing/Payments | 137 | - | N |
| `RepairShopApp/src/lib/jobCardService.ts` | util | mobile | Jobs | 241 | jobs, job_materials, users, job_technicians | N |
| `RepairShopApp/src/lib/shared/index.ts` | util | mobile | Common | 14 | - | N |
| `RepairShopApp/src/lib/shared/src/badgeConfig.test.ts` | test | mobile | Common | 32 | - | Y |
| `RepairShopApp/src/lib/shared/src/badgeConfig.ts` | util | mobile | Common | 55 | - | Y |
| `RepairShopApp/src/lib/shared/src/billing.test.ts` | test | mobile | Billing/Payments | 443 | - | Y |
| `RepairShopApp/src/lib/shared/src/billing.ts` | util | mobile | Billing/Payments | 389 | - | Y |
| `RepairShopApp/src/lib/shared/src/concurrencyStock.test.ts` | test | mobile | Inventory/Stock | 77 | - | Y |
| `RepairShopApp/src/lib/shared/src/date.test.ts` | test | mobile | Common | 137 | - | Y |
| `RepairShopApp/src/lib/shared/src/date.ts` | util | mobile | Common | 138 | - | Y |
| `RepairShopApp/src/lib/shared/src/formatCurrency.test.ts` | test | mobile | Common | 28 | - | Y |
| `RepairShopApp/src/lib/shared/src/formatCurrency.ts` | util | mobile | Common | 18 | - | Y |
| `RepairShopApp/src/lib/shared/src/hooks/useDebounceValue.test.ts` | hook | mobile | Common | 42 | - | Y |
| `RepairShopApp/src/lib/shared/src/hooks/useDebounceValue.ts` | hook | mobile | Common | 18 | - | Y |
| `RepairShopApp/src/lib/shared/src/imageUtils.test.ts` | test | mobile | Common | 51 | - | Y |
| `RepairShopApp/src/lib/shared/src/imageUtils.ts` | util | mobile | Common | 67 | - | Y |
| `RepairShopApp/src/lib/shared/src/incentive.test.ts` | test | mobile | Common | 56 | - | Y |
| `RepairShopApp/src/lib/shared/src/incentive.ts` | util | mobile | Common | 53 | - | Y |
| `RepairShopApp/src/lib/shared/src/jobCardTemplate.ts` | util | mobile | Jobs | 549 | - | N |
| `RepairShopApp/src/lib/shared/src/payroll.test.ts` | test | mobile | Salary/Payroll | 147 | - | Y |
| `RepairShopApp/src/lib/shared/src/payrollEngine.ts` | util | mobile | Salary/Payroll | 245 | - | N |
| `RepairShopApp/src/lib/shared/src/phone.test.ts` | test | mobile | Common | 139 | - | Y |
| `RepairShopApp/src/lib/shared/src/phone.ts` | util | mobile | Common | 132 | - | Y |
| `RepairShopApp/src/lib/shared/src/storageUrlCache.test.ts` | test | mobile | Common | 54 | - | Y |
| `RepairShopApp/src/lib/shared/src/storageUrlCache.ts` | util | mobile | Common | 38 | - | Y |
| `RepairShopApp/src/lib/shared/src/types.ts` | type | mobile | Common | 500 | - | N |
| `RepairShopApp/src/lib/supabase.ts` | util | mobile | Common | 29 | - | N |
| `RepairShopApp/src/navigation/AdminStack.tsx` | navigation | mobile | Common | 63 | - | N |
| `RepairShopApp/src/navigation/AdminTabs.tsx` | navigation | mobile | Common | 111 | - | N |
| `RepairShopApp/src/navigation/CustomTabBar.tsx` | navigation | mobile | Common | 200 | - | N |
| `RepairShopApp/src/navigation/ReceptionistJobsStack.tsx` | navigation | mobile | Jobs | 35 | - | N |
| `RepairShopApp/src/navigation/ReceptionistStack.tsx` | navigation | mobile | Common | 44 | - | N |
| `RepairShopApp/src/navigation/ReceptionistTabs.tsx` | navigation | mobile | Common | 111 | - | N |
| `RepairShopApp/src/navigation/RootNavigator.tsx` | navigation | mobile | Common | 65 | - | N |
| `RepairShopApp/src/navigation/TechnicianJobsStack.tsx` | navigation | mobile | Jobs | 27 | - | N |
| `RepairShopApp/src/navigation/TechnicianStack.tsx` | navigation | mobile | Common | 28 | - | N |
| `RepairShopApp/src/navigation/TechnicianTabs.tsx` | navigation | mobile | Common | 29 | - | N |
| `RepairShopApp/src/navigation/navigationRef.ts` | navigation | mobile | Common | 4 | - | N |
| `RepairShopApp/src/screens/admin/AdminCreateStaffScreen.tsx` | screen | mobile | Auth/Staff | 386 | edge:admin-create-user | N |
| `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx` | screen | mobile | Jobs | 220 | jobs, job_technicians, job_materials | N |
| `RepairShopApp/src/screens/admin/AdminJobsScreen.tsx` | screen | mobile | Jobs | 212 | jobs, rpc:get_job_status_counts | N |
| `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx` | screen | mobile | Expenditure | 662 | payments | N |
| `RepairShopApp/src/screens/admin/OverviewScreen.tsx` | screen | mobile | Common | 423 | notifications, jobs, invoices, sales | N |
| `RepairShopApp/src/screens/admin/PurchaseIntakeScreen.tsx` | screen | mobile | Inventory/Stock | 1448 | rpc:search_suppliers, rpc:search_products_catalog, rpc:log_inventory_purchase | N |
| `RepairShopApp/src/screens/admin/ReportsScreen.tsx` | screen | mobile | Reports | 452 | jobs, invoices, sales, users | N |
| `RepairShopApp/src/screens/admin/SalaryScreen.tsx` | screen | mobile | Salary/Payroll | 502 | users, edge:calculate-monthly-salary | N |
| `RepairShopApp/src/screens/admin/StaffAttendanceOverviewScreen.tsx` | screen | mobile | Attendance | 810 | users, attendance | N |
| `RepairShopApp/src/screens/admin/StaffScreen.tsx` | screen | mobile | Auth/Staff | 605 | users, attendance, rpc:admin_manage_staff_status, edge:admin-delete-user | N |
| `RepairShopApp/src/screens/auth/LoginScreen.tsx` | screen | mobile | Auth/Staff | 1013 | users, rpc:record_user_login | N |
| `RepairShopApp/src/screens/auth/ResetPasswordScreen.tsx` | screen | mobile | Auth/Staff | 321 | - | N |
| `RepairShopApp/src/screens/receptionist/AnalyticsScreen.tsx` | screen | mobile | Reports | 355 | jobs | N |
| `RepairShopApp/src/screens/receptionist/BillingScreen.tsx` | screen | mobile | Billing/Payments | 634 | jobs, job_materials, invoices, invoice_items | N |
| `RepairShopApp/src/screens/receptionist/CustomerIntakeScreen.tsx` | screen | mobile | Customers | 452 | job_types, ui_device_types | N |
| `RepairShopApp/src/screens/receptionist/CustomersScreen.tsx` | screen | mobile | Customers | 916 | jobs, sales, rpc:search_customers_v2, rpc:update_customer_profile | N |
| `RepairShopApp/src/screens/receptionist/DashboardScreen.tsx` | screen | mobile | Common | 311 | notifications, jobs | N |
| `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx` | screen | mobile | Jobs | 429 | jobs, job_technicians, rpc:generate_job_code, rpc:find_or_create_customer | N |
| `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx` | screen | mobile | Jobs | 312 | jobs, job_technicians, job_materials | N |
| `RepairShopApp/src/screens/receptionist/JobListScreen.tsx` | screen | mobile | Jobs | 198 | jobs, rpc:get_job_status_counts | N |
| `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx` | screen | mobile | Sales | 595 | inventory, rpc:find_or_create_customer, rpc:create_invoice, rpc:claim_invoice_serials | N |
| `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx` | screen | mobile | Materials | 298 | material_allotments, rpc:return_allocated_material, rpc:notify_technician_allocated_material | N |
| `RepairShopApp/src/screens/shared/AttendanceScreen.tsx` | screen | mobile | Attendance | 1268 | attendance, geofence_settings, employee_leave, rpc:check_leave_conflict | N |
| `RepairShopApp/src/screens/shared/InactiveUserScreen.tsx` | screen | mobile | Auth/Staff | 138 | - | N |
| `RepairShopApp/src/screens/shared/InventoryScreen.tsx` | screen | mobile | Inventory/Stock | 664 | inventory, products, rpc:get_purchase_history | N |
| `RepairShopApp/src/screens/shared/LoadingScreen.tsx` | screen | mobile | Common | 24 | - | N |
| `RepairShopApp/src/screens/shared/NotificationsScreen.tsx` | screen | mobile | Notifications | 462 | notifications | N |
| `RepairShopApp/src/screens/shared/PendingPaymentsScreen.tsx` | screen | mobile | Billing/Payments | 1225 | invoices, rpc:get_pending_invoices, rpc:record_installment_payment, edge:notify-on-finance-event | N |
| `RepairShopApp/src/screens/shared/ProfileScreen.tsx` | screen | mobile | Common | 248 | users | N |
| `RepairShopApp/src/screens/shared/SalaryScreen.tsx` | screen | mobile | Salary/Payroll | 439 | staff_rates, salary, employee_leave, edge:calculate-monthly-salary | N |
| `RepairShopApp/src/screens/shared/SaleDetailScreen.tsx` | screen | mobile | Sales | 250 | invoices | N |
| `RepairShopApp/src/screens/shared/SalesListScreen.tsx` | screen | mobile | Sales | 281 | invoice_items, invoices | N |
| `RepairShopApp/src/screens/technician/AllottedMaterialsScreen.tsx` | screen | mobile | Materials | 308 | material_allotments, rpc:use_material_allotment | N |
| `RepairShopApp/src/screens/technician/MyJobsScreen.tsx` | screen | mobile | Jobs | 218 | notifications, jobs, rpc:get_job_status_counts | N |
| `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx` | screen | mobile | Common | 378 | jobs, job_technicians, onsite_visits, rpc:record_onsite_arrival_checkin | N |
| `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx` | screen | mobile | Common | 431 | notifications, jobs, rpc:get_job_status_counts | N |
| `RepairShopApp/src/screens/technician/TechnicianReportsScreen.tsx` | screen | mobile | Reports | 610 | jobs, onsite_visits, job_materials | N |
| `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx` | screen | mobile | Common | 737 | job_types, jobs, job_technicians, onsite_visits | N |
| `RepairShopApp/src/scripts/checkColumns.js` | util | mobile | Common | 27 | invoice_items, sale_items | Y |
| `RepairShopApp/src/tokens.ts` | util | mobile | Common | 246 | - | N |
| `RepairShopApp/src/types/attendance.ts` | type | mobile | Attendance | 18 | - | N |
| `RepairShopApp/src/types/billing.ts` | type | mobile | Billing/Payments | 27 | - | N |
| `RepairShopApp/src/types/job.ts` | type | mobile | Jobs | 73 | - | N |
| `RepairShopApp/src/types/onsiteVisit.ts` | type | mobile | Common | 18 | - | N |
| `RepairShopApp/src/types/user.ts` | type | mobile | Auth/Staff | 20 | - | N |
| `RepairShopApp/src/utils/authLink.ts` | util | mobile | Auth/Staff | 42 | - | N |
| `RepairShopApp/src/utils/compressImage.ts` | util | mobile | Common | 16 | - | N |
| `RepairShopApp/src/utils/distance.ts` | util | mobile | Common | 26 | - | N |
| `RepairShopApp/src/utils/errorMessages.ts` | util | mobile | Common | 84 | - | N |
| `RepairShopApp/src/utils/playNotificationSound.ts` | util | mobile | Notifications | 91 | - | N |
| `RepairShopApp/src/utils/rememberMe.ts` | util | mobile | Common | 77 | - | N |
| `RepairShopApp/src/utils/storagePaths.ts` | util | mobile | Common | 8 | - | N |
| `RepairShopApp/src/utils/supabaseStorage.ts` | util | mobile | Common | 43 | - | N |
| `RepairShopApp/tsconfig.json` | config | mobile | Common | 25 | - | Y |
| `admin-panel/package.json` | config | web | Common | 47 | - | Y |
| `admin-panel/src/app/(admin)/attendance/page.tsx` | page | web | Attendance | 465 | attendance, users | N |
| `admin-panel/src/app/(admin)/customers/page.tsx` | page | web | Customers | 811 | customers, jobs, invoices, sales | N |
| `admin-panel/src/app/(admin)/expenditure/page.tsx` | page | web | Expenditure | 182 | payments | N |
| `admin-panel/src/app/(admin)/inventory/page.tsx` | page | web | Inventory/Stock | 398 | inventory, products | N |
| `admin-panel/src/app/(admin)/job-types/page.tsx` | page | web | Jobs | 210 | job_types | N |
| `admin-panel/src/app/(admin)/jobs/[id]/page.tsx` | page | web | Jobs | 274 | jobs, job_materials, invoices, users | N |
| `admin-panel/src/app/(admin)/jobs/[id]/reducer.test.ts` | test | web | Jobs | 154 | - | Y |
| `admin-panel/src/app/(admin)/jobs/[id]/reducer.ts` | util | web | Jobs | 149 | - | Y |
| `admin-panel/src/app/(admin)/jobs/new/page.tsx` | page | web | Jobs | 367 | users, job_types, ui_device_types, jobs | N |
| `admin-panel/src/app/(admin)/jobs/new/reducer.ts` | util | web | Jobs | 100 | - | N |
| `admin-panel/src/app/(admin)/jobs/page.tsx` | page | web | Jobs | 582 | jobs, users, rpc:get_job_status_counts | N |
| `admin-panel/src/app/(admin)/layout.tsx` | page | web | Common | 6 | - | N |
| `admin-panel/src/app/(admin)/materials/page.tsx` | page | web | Materials | 643 | material_allotments, job_materials, notifications, rpc:notify_technician_allocated_material | N |
| `admin-panel/src/app/(admin)/page.tsx` | page | web | Common | 885 | material_allotments, job_materials, jobs, users | N |
| `admin-panel/src/app/(admin)/pending-payments/page.tsx` | page | web | Billing/Payments | 985 | invoices, rpc:get_pending_invoices, rpc:record_installment_payment, edge:notify-on-finance-event | N |
| `admin-panel/src/app/(admin)/reports/page.tsx` | page | web | Reports | 793 | jobs, invoices, export_jobs_latest | N |
| `admin-panel/src/app/(admin)/salary/page.tsx` | page | web | Salary/Payroll | 151 | users | N |
| `admin-panel/src/app/(admin)/sales/[id]/page.tsx` | page | web | Sales | 232 | invoices | N |
| `admin-panel/src/app/(admin)/sales/new/page.tsx` | page | web | Sales | 1185 | inventory, rpc:preview_invoice, rpc:find_or_create_customer, rpc:create_invoice | N |
| `admin-panel/src/app/(admin)/sales/new/salesFlow.test.ts` | test | web | Sales | 224 | - | Y |
| `admin-panel/src/app/(admin)/sales/page.tsx` | page | web | Sales | 351 | invoices, invoice_items | N |
| `admin-panel/src/app/(admin)/settings/geofence/page.tsx` | page | web | Settings | 202 | geofence_settings | N |
| `admin-panel/src/app/(admin)/settings/page.tsx` | page | web | Settings | 322 | users | N |
| `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx` | page | web | Notifications | 291 | whatsapp_settings, whatsapp_logs, edge:notify-on-finance-event | N |
| `admin-panel/src/app/(admin)/staff/leaves/page.tsx` | page | web | Auth/Staff | 162 | employee_leave | N |
| `admin-panel/src/app/(admin)/staff/page.tsx` | page | web | Auth/Staff | 370 | users, rpc:admin_manage_staff_status, edge:admin-delete-user | N |
| `admin-panel/src/app/api/test/route.ts` | API route | web | Common | 23 | - | N |
| `admin-panel/src/app/error.tsx` | util | web | Common | 35 | - | N |
| `admin-panel/src/app/global-error.tsx` | util | web | Common | 29 | - | N |
| `admin-panel/src/app/layout.tsx` | page | web | Common | 57 | - | N |
| `admin-panel/src/app/login/page.tsx` | page | web | Auth/Staff | 543 | users, rpc:record_user_login | N |
| `admin-panel/src/app/reset-password/page.tsx` | page | web | Common | 341 | - | N |
| `admin-panel/src/components/attendance/StaffAttendanceDrawer.tsx` | component | web | Attendance | 379 | attendance | N |
| `admin-panel/src/components/billing/PaymentRecordingBox.tsx` | component | web | Billing/Payments | 296 | rpc:record_installment_payment | N |
| `admin-panel/src/components/catalog/JobTypeFormModal.tsx` | component | web | Jobs | 172 | job_types | N |
| `admin-panel/src/components/common/ActiveFiltersBar.tsx` | component | web | Common | 70 | - | N |
| `admin-panel/src/components/common/Badge.tsx` | component | web | Common | 34 | - | N |
| `admin-panel/src/components/common/Button.tsx` | component | web | Common | 52 | - | N |
| `admin-panel/src/components/common/CameraBarcodeScannerModal.tsx` | component | web | Common | 279 | - | N |
| `admin-panel/src/components/common/Card.tsx` | component | web | Common | 47 | - | N |
| `admin-panel/src/components/common/ConfirmationModal.tsx` | component | web | Common | 98 | - | N |
| `admin-panel/src/components/common/DataTable.tsx` | component | web | Common | 112 | - | N |
| `admin-panel/src/components/common/EmptyState.tsx` | component | web | Common | 47 | - | N |
| `admin-panel/src/components/common/ErrorState.tsx` | component | web | Common | 50 | - | N |
| `admin-panel/src/components/common/Input.tsx` | component | web | Common | 25 | - | N |
| `admin-panel/src/components/common/LoadingState.tsx` | component | web | Common | 60 | - | N |
| `admin-panel/src/components/common/Modal.tsx` | component | web | Common | 167 | - | N |
| `admin-panel/src/components/common/PageHeader.tsx` | component | web | Common | 31 | - | N |
| `admin-panel/src/components/common/Pagination.tsx` | component | web | Common | 56 | - | N |
| `admin-panel/src/components/common/PrintProgressModal.tsx` | component | web | Common | 94 | - | N |
| `admin-panel/src/components/common/PriorityBadge.tsx` | component | web | Common | 22 | - | N |
| `admin-panel/src/components/common/ProgressBar.tsx` | component | web | Common | 57 | - | N |
| `admin-panel/src/components/common/SearchFilterBar.tsx` | component | web | Common | 86 | - | N |
| `admin-panel/src/components/common/SectionCard.tsx` | component | web | Common | 56 | - | N |
| `admin-panel/src/components/common/Select.tsx` | component | web | Common | 33 | - | N |
| `admin-panel/src/components/common/Skeleton.tsx` | component | web | Common | 185 | - | N |
| `admin-panel/src/components/common/StatCard.tsx` | component | web | Common | 99 | - | N |
| `admin-panel/src/components/common/StatusBadge.tsx` | component | web | Common | 22 | - | N |
| `admin-panel/src/components/common/Tabs.tsx` | component | web | Common | 44 | - | N |
| `admin-panel/src/components/common/Textarea.tsx` | component | web | Common | 24 | - | N |
| `admin-panel/src/components/common/Toast.tsx` | component | web | Common | 98 | - | N |
| `admin-panel/src/components/common/ToastProvider.tsx` | component | web | Common | 73 | - | N |
| `admin-panel/src/components/customers/CustomerLedgerTab.tsx` | component | web | Customers | 829 | invoices, invoice_payments, customer_wallet_transactions, rpc:deposit_customer_advance | N |
| `admin-panel/src/components/customers/CustomerTypeahead.tsx` | component | web | Customers | 233 | rpc:search_customers_v2 | N |
| `admin-panel/src/components/dashboard/JobsPieChart.tsx` | component | web | Jobs | 35 | - | N |
| `admin-panel/src/components/dashboard/RevenueChart.tsx` | component | web | Common | 58 | - | N |
| `admin-panel/src/components/dashboard/TechPerformanceChart.tsx` | component | web | Common | 22 | - | N |
| `admin-panel/src/components/expenditure/ExpenditureForm.tsx` | component | web | Expenditure | 76 | payments | N |
| `admin-panel/src/components/expenditure/ExpenditureSummaryCards.tsx` | component | web | Expenditure | 54 | - | N |
| `admin-panel/src/components/expenditure/ExpenditureTable.tsx` | component | web | Expenditure | 77 | - | N |
| `admin-panel/src/components/inventory/AddStockModal.tsx` | component | web | Inventory/Stock | 130 | rpc:add_stock | N |
| `admin-panel/src/components/inventory/InventoryFormModal.tsx` | component | web | Inventory/Stock | 326 | products, inventory, rpc:create_product_with_opening_stock | N |
| `admin-panel/src/components/inventory/ProductTypeahead.tsx` | component | web | Inventory/Stock | 255 | rpc:search_products_catalog | N |
| `admin-panel/src/components/inventory/PurchaseDetailModal.tsx` | component | web | Inventory/Stock | 318 | rpc:get_purchase_order_details | N |
| `admin-panel/src/components/inventory/PurchaseHistoryTab.tsx` | component | web | Inventory/Stock | 297 | rpc:get_purchase_history | N |
| `admin-panel/src/components/inventory/PurchaseIntakeModal.tsx` | component | web | Inventory/Stock | 1026 | purchase-invoices, rpc:log_multi_item_purchase | N |
| `admin-panel/src/components/inventory/SerialSelectionDropdown.tsx` | component | web | Inventory/Stock | 354 | rpc:search_available_serials | N |
| `admin-panel/src/components/inventory/StockSerialBackfillModal.tsx` | component | web | Inventory/Stock | 407 | inventory_unit_serials, products | N |
| `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx` | component | web | Jobs | 155 | job_technicians, jobs | N |
| `admin-panel/src/components/jobs/detail/JobBillingCard.tsx` | component | web | Jobs | 664 | invoices, rpc:find_or_create_customer, rpc:create_invoice, rpc:update_invoice | N |
| `admin-panel/src/components/jobs/detail/JobConfigCard.tsx` | component | web | Jobs | 171 | - | N |
| `admin-panel/src/components/jobs/detail/JobInfoCard.tsx` | component | web | Jobs | 247 | jobs | N |
| `admin-panel/src/components/jobs/detail/JobMaterialsCard.tsx` | component | web | Jobs | 159 | job_materials | N |
| `admin-panel/src/components/jobs/detail/JobNotesCard.tsx` | component | web | Jobs | 56 | jobs | N |
| `admin-panel/src/components/jobs/detail/MaterialReconciliationModal.tsx` | component | web | Jobs | 231 | job_materials, rpc:complete_job_materials | N |
| `admin-panel/src/components/jobs/detail/OnsiteDetailsCard.tsx` | component | web | Jobs | 242 | - | N |
| `admin-panel/src/components/jobs/detail/OverviewTab.tsx` | component | web | Jobs | 237 | - | N |
| `admin-panel/src/components/jobs/new/AssignmentCard.tsx` | component | web | Jobs | 92 | - | N |
| `admin-panel/src/components/jobs/new/CustomerInfoCard.tsx` | component | web | Jobs | 124 | - | N |
| `admin-panel/src/components/jobs/new/DeviceIssueCard.tsx` | component | web | Jobs | 166 | - | N |
| `admin-panel/src/components/jobs/new/JobSuccessCard.tsx` | component | web | Jobs | 92 | - | N |
| `admin-panel/src/components/jobs/new/ServiceCatalogCard.tsx` | component | web | Jobs | 64 | - | N |
| `admin-panel/src/components/layout/AdminLayout.tsx` | component | web | Common | 92 | - | N |
| `admin-panel/src/components/layout/NotificationsDropdown.tsx` | component | web | Notifications | 331 | - | N |
| `admin-panel/src/components/layout/Sidebar.tsx` | component | web | Common | 186 | - | N |
| `admin-panel/src/components/layout/Topbar.tsx` | component | web | Common | 342 | notifications | N |
| `admin-panel/src/components/salary/AdvanceSalaryForm.tsx` | component | web | Salary/Payroll | 130 | rpc:record_advance_salary | N |
| `admin-panel/src/components/salary/BonusForm.tsx` | component | web | Salary/Payroll | 131 | rpc:record_bonus | N |
| `admin-panel/src/components/salary/HolidayCalendarForm.tsx` | component | web | Salary/Payroll | 162 | holidays | N |
| `admin-panel/src/components/salary/LeaveManagement.tsx` | component | web | Salary/Payroll | 232 | employee_leave | N |
| `admin-panel/src/components/salary/PayrollRunPanel.tsx` | component | web | Salary/Payroll | 354 | salary | N |
| `admin-panel/src/components/salary/SalaryBreakdownCard.tsx` | component | web | Salary/Payroll | 246 | - | N |
| `admin-panel/src/components/salary/SalaryCalculatorForm.tsx` | component | web | Salary/Payroll | 103 | - | N |
| `admin-panel/src/components/salary/StaffRateForm.tsx` | component | web | Salary/Payroll | 210 | staff_rates | N |
| `admin-panel/src/components/settings/GeofenceMap.tsx` | component | web | Settings | 378 | - | N |
| `admin-panel/src/components/staff/AddStaffModal.tsx` | component | web | Auth/Staff | 210 | edge:admin-create-user | N |
| `admin-panel/src/components/suppliers/SupplierTypeahead.tsx` | component | web | Common | 249 | rpc:search_suppliers | N |
| `admin-panel/src/constants/colors.ts` | util | web | Common | 35 | - | N |
| `admin-panel/src/context/AppConfigContext.tsx` | context | web | Common | 136 | ui_job_statuses, ui_priorities, ui_service_locations, ui_payment_statuses | N |
| `admin-panel/src/context/AuthContext.tsx` | context | web | Auth/Staff | 182 | users | N |
| `admin-panel/src/hooks/useCountUp.ts` | hook | web | Common | 56 | - | N |
| `admin-panel/src/hooks/useHardwareBarcodeScanner.ts` | hook | web | Common | 82 | - | N |
| `admin-panel/src/lib/authLink.test.ts` | test | web | Auth/Staff | 38 | - | Y |
| `admin-panel/src/lib/customerLedgerExcel.test.ts` | test | web | Customers | 146 | - | Y |
| `admin-panel/src/lib/customerLedgerExcel.ts` | util | web | Customers | 442 | - | Y |
| `admin-panel/src/lib/driveHelpers.ts` | util | web | Common | 5 | - | N |
| `admin-panel/src/lib/edgeFunctions.test.ts` | test | web | Common | 154 | - | Y |
| `admin-panel/src/lib/edgeFunctions.ts` | util | web | Common | 50 | - | Y |
| `admin-panel/src/lib/invoiceClient.ts` | util | web | Billing/Payments | 162 | - | N |
| `admin-panel/src/lib/jobCardClient.ts` | util | web | Jobs | 235 | jobs, job_materials, users, job_technicians | N |
| `admin-panel/src/lib/jobCreationFlow.test.ts` | test | web | Jobs | 171 | - | Y |
| `admin-panel/src/lib/permissionMatrix.test.ts` | test | web | Common | 131 | - | Y |
| `admin-panel/src/lib/purchaseIntakeFlow.test.ts` | test | web | Inventory/Stock | 125 | - | Y |
| `admin-panel/src/lib/resendRateLimit.test.ts` | test | web | Salary/Payroll | 90 | - | Y |
| `admin-panel/src/lib/schemaValidation.test.ts` | test | web | Common | 79 | - | Y |
| `admin-panel/src/lib/serialInventoryTracking.test.ts` | test | web | Inventory/Stock | 181 | - | Y |
| `admin-panel/src/lib/siteUrl.test.ts` | test | web | Common | 44 | - | Y |
| `admin-panel/src/lib/siteUrl.ts` | util | web | Common | 43 | - | Y |
| `admin-panel/src/lib/supabase.ts` | util | web | Common | 7 | - | N |
| `admin-panel/src/lib/tokens.ts` | util | web | Common | 41 | - | N |
| `admin-panel/src/lib/utils.ts` | util | web | Common | 7 | - | N |
| `admin-panel/src/lib/webNotifications.ts` | util | web | Notifications | 139 | - | N |
| `admin-panel/src/providers/QueryProvider.tsx` | util | web | Common | 27 | - | N |
| `admin-panel/src/types/inventory.ts` | type | web | Inventory/Stock | 38 | - | N |
| `admin-panel/src/types/salary.ts` | type | web | Salary/Payroll | 186 | - | N |
| `admin-panel/src/types/sales.ts` | type | web | Sales | 60 | - | N |
| `admin-panel/src/utils/csv.ts` | util | web | Common | 92 | - | N |
| `admin-panel/src/utils/formatDate.ts` | util | web | Common | 20 | - | N |
| `admin-panel/src/utils/materialsCsv.ts` | util | web | Materials | 50 | - | N |
| `admin-panel/src/utils/receiptHtml.ts` | util | web | Common | 77 | - | N |
| `admin-panel/src/utils/salary.test.ts` | test | web | Salary/Payroll | 142 | - | Y |
| `admin-panel/src/utils/salary.ts` | util | web | Salary/Payroll | 111 | - | Y |
| `admin-panel/src/utils/salarySlipHtml.ts` | util | web | Salary/Payroll | 139 | - | N |
| `admin-panel/src/utils/salesCsv.ts` | util | web | Sales | 50 | - | N |
| `package.json` | config | shared | Common | 23 | - | Y |
| `packages/shared/index.ts` | util | shared | Common | 14 | - | N |
| `packages/shared/src/badgeConfig.test.ts` | test | shared | Common | 32 | - | Y |
| `packages/shared/src/badgeConfig.ts` | util | shared | Common | 55 | - | Y |
| `packages/shared/src/billing.test.ts` | test | shared | Billing/Payments | 443 | - | Y |
| `packages/shared/src/billing.ts` | util | shared | Billing/Payments | 389 | - | Y |
| `packages/shared/src/concurrencyStock.test.ts` | test | shared | Inventory/Stock | 77 | - | Y |
| `packages/shared/src/date.test.ts` | test | shared | Common | 137 | - | Y |
| `packages/shared/src/date.ts` | util | shared | Common | 138 | - | Y |
| `packages/shared/src/formatCurrency.test.ts` | test | shared | Common | 28 | - | Y |
| `packages/shared/src/formatCurrency.ts` | util | shared | Common | 18 | - | Y |
| `packages/shared/src/hooks/useDebounceValue.test.ts` | hook | shared | Common | 42 | - | Y |
| `packages/shared/src/hooks/useDebounceValue.ts` | hook | shared | Common | 18 | - | Y |
| `packages/shared/src/imageUtils.test.ts` | test | shared | Common | 51 | - | Y |
| `packages/shared/src/imageUtils.ts` | util | shared | Common | 67 | - | Y |
| `packages/shared/src/incentive.test.ts` | test | shared | Common | 56 | - | Y |
| `packages/shared/src/incentive.ts` | util | shared | Common | 53 | - | Y |
| `packages/shared/src/jobCardTemplate.test.ts` | test | shared | Jobs | 107 | - | Y |
| `packages/shared/src/jobCardTemplate.ts` | util | shared | Jobs | 549 | - | Y |
| `packages/shared/src/payroll.test.ts` | test | shared | Salary/Payroll | 151 | - | Y |
| `packages/shared/src/payrollEngine.ts` | util | shared | Salary/Payroll | 251 | - | N |
| `packages/shared/src/phone.test.ts` | test | shared | Common | 139 | - | Y |
| `packages/shared/src/phone.ts` | util | shared | Common | 132 | - | Y |
| `packages/shared/src/storageUrlCache.test.ts` | test | shared | Common | 54 | - | Y |
| `packages/shared/src/storageUrlCache.ts` | util | shared | Common | 38 | - | Y |
| `packages/shared/src/types.ts` | type | shared | Common | 500 | - | N |
| `scripts/build_full_documentation.js` | util | scripts | Common | 1039 | jobs, users, invoices, payments | Y |
| `scripts/build_test_report.js` | util | scripts | Reports | 326 | billing, rpc:return_material_allotment, rpc:count_low_stock_items | Y |
| `scripts/deep_audit.js` | util | scripts | Common | 79 | - | Y |
| `scripts/extract_admin_pages.js` | util | scripts | Common | 52 | ) || l.includes(, rpc:) || l.includes(, edge:));
  const stateHooks = lines.filter(l => l.includes( | Y |
| `scripts/extract_mobile_screens.js` | util | scripts | Common | 68 | ) || l.includes(, rpc:) || l.includes(, edge:));
  // Find state declarations (useState, useReducer)
  const stateHooks = lines.filter(l => l.includes( | Y |
| `scripts/generate_all_logos.js` | util | scripts | Salary/Payroll | 242 | - | Y |
| `scripts/generate_doc.js` | util | scripts | Salary/Payroll | 12 | - | Y |
| `scripts/get-google-refresh-token.mjs` | util | scripts | Common | 104 | - | Y |
| `scripts/parse.js` | util | scripts | Common | 22 | - | Y |
| `scripts/parse_edge_functions.js` | util | scripts | Common | 40 | - | Y |
| `scripts/parse_schema.js` | util | scripts | Common | 46 | - | Y |
| `scripts/refactor_imports.js` | util | scripts | Common | 65 | - | Y |
| `scripts/rls-smoke-test.ts` | util | scripts | Common | 279 | users, jobs, billing, salary | N |
| `scripts/run_all_tests.js` | util | scripts | Common | 47 | - | Y |
| `scripts/scan_screens.js` | util | scripts | Common | 61 | - | Y |
| `supabase/functions/_shared/attendanceReport.ts` | edge function | backend | Attendance | 168 | attendance | N |
| `supabase/functions/_shared/driveFolders.ts` | edge function | backend | Common | 164 | - | N |
| `supabase/functions/_shared/driveUpload.ts` | edge function | backend | Common | 165 | - | N |
| `supabase/functions/_shared/exportWorkbook.ts` | edge function | backend | Reports | 282 | jobs, sales, inventory | N |
| `supabase/functions/_shared/googleAuth.ts` | edge function | backend | Auth/Staff | 94 | - | N |
| `supabase/functions/_shared/notifications.ts` | edge function | backend | Notifications | 143 | notifications, users | N |
| `supabase/functions/_shared/whatsappClient.ts` | edge function | backend | Notifications | 320 | whatsapp_settings, whatsapp_messages, whatsapp_logs | N |
| `supabase/functions/admin-create-user/index.ts` | edge function | backend | Auth/Staff | 106 | users | N |
| `supabase/functions/admin-delete-user/index.ts` | edge function | backend | Auth/Staff | 209 | users, jobs, job_technicians, payments | N |
| `supabase/functions/calculate-monthly-salary/index.ts` | edge function | backend | Salary/Payroll | 551 | payroll_audit_log, users, salary, staff_rates | N |
| `supabase/functions/export-attendance-reports/index.ts` | edge function | backend | Attendance | 197 | users, export_jobs | N |
| `supabase/functions/export-customer-ledger/index.ts` | edge function | backend | Customers | 581 | customers, invoices, payments | N |
| `supabase/functions/export-monthly-data/index.ts` | edge function | backend | Reports | 193 | users, export_jobs | N |
| `supabase/functions/generate-invoice/calc.ts` | edge function | backend | Salary/Payroll | 39 | - | N |
| `supabase/functions/generate-invoice/companyConfig.ts` | edge function | backend | Salary/Payroll | 22 | - | N |
| `supabase/functions/generate-invoice/index.ts` | edge function | backend | Salary/Payroll | 397 | invoices, jobs, sales, pending_uploads | N |
| `supabase/functions/generate-invoice/svgAssets.ts` | edge function | backend | Salary/Payroll | 9 | - | N |
| `supabase/functions/generate-invoice/svgTemplate.ts` | edge function | backend | Salary/Payroll | 615 | - | N |
| `supabase/functions/notify-on-finance-event/index.ts` | edge function | backend | Notifications | 277 | users, whatsapp_settings | N |
| `supabase/functions/notify-on-inventory-change/index.ts` | edge function | backend | Inventory/Stock | 89 | products, users | N |
| `supabase/functions/notify-on-job-created/index.ts` | edge function | backend | Jobs | 187 | users, job_technicians | N |
| `supabase/functions/notify-on-late-checkin/index.ts` | edge function | backend | Notifications | 96 | users | N |
| `supabase/functions/notify-on-leave-event/index.ts` | edge function | backend | Notifications | 101 | users | N |
| `supabase/functions/notify-on-material-event/index.ts` | edge function | backend | Materials | 117 | material_allotments | N |
| `supabase/functions/notify-on-onsite-visit/index.ts` | edge function | backend | Notifications | 86 | jobs, users | N |
| `supabase/functions/notify-on-status-change/index.ts` | edge function | backend | Notifications | 274 | users, job_technicians, invoices, whatsapp_settings | N |
| `supabase/functions/process-pending-uploads/index.ts` | edge function | backend | Common | 225 | pending_uploads, attendance, onsite_visits, invoices | N |
| `supabase/functions/send-invoice-email/index.ts` | edge function | backend | Billing/Payments | 173 | notifications, invoices, billing_legacy, jobs | N |
| `supabase/functions/test-drive-auth/index.ts` | edge function | backend | Auth/Staff | 68 | - | N |
| `supabase/functions/upload-attendance-selfie/index.ts` | edge function | backend | Attendance | 107 | - | N |
| `supabase/functions/upload-avatar/index.ts` | edge function | backend | Common | 92 | - | N |
| `supabase/functions/upload-job-photo/index.ts` | edge function | backend | Jobs | 110 | - | N |
| `supabase/functions/upload-material-photo/index.ts` | edge function | backend | Materials | 97 | jobs | N |
| `supabase/functions/whatsapp-webhook/index.ts` | edge function | backend | Notifications | 222 | whatsapp_settings, whatsapp_messages, whatsapp_logs | N |
| `supabase/migrations/20260819000000_baseline_schema.sql` | migration | backend | Common | 2047 | - | Y |
| `supabase/migrations/20260819175458_add_missing_inventory_rpc_columns.sql` | migration | backend | Inventory/Stock | 48 | - | Y |
| `supabase/migrations/20260819180137_rename_selling_price_to_selling_rate.sql` | migration | backend | Salary/Payroll | 46 | - | Y |
| `supabase/migrations/20260820000001_add_preview_invoice_and_amount_paid.sql` | migration | backend | Billing/Payments | 187 | rpc:preview_invoice | Y |
| `supabase/migrations/20260820000002_drop_leave_type.sql` | migration | backend | Common | 3 | - | Y |
| `supabase/migrations/20260820000003_fix_amount_paid_in_create_invoice.sql` | migration | backend | Billing/Payments | 266 | - | Y |
| `supabase/migrations/20260820000004_restore_google_drive.sql` | migration | backend | Common | 114 | - | Y |
| `supabase/migrations/20260820000005_fix_inventory_stock_trigger.sql` | migration | backend | Inventory/Stock | 74 | - | Y |
| `supabase/migrations/20260820100000_allocated_materials_lifecycle.sql` | migration | backend | Materials | 485 | - | Y |
| `supabase/migrations/20260820200000_customers_module.sql` | migration | backend | Customers | 438 | - | Y |
| `supabase/migrations/20260821000000_salary_engine_schema_fixes.sql` | migration | backend | Salary/Payroll | 144 | - | Y |
| `supabase/migrations/20260821100000_device_type_resolution.sql` | migration | backend | Jobs | 80 | - | Y |
| `supabase/migrations/20260821200000_push_notifications_webhook_pipeline.sql` | migration | backend | Notifications | 158 | - | Y |
| `supabase/migrations/20260821300000_inventory_purchase_intake_module.sql` | migration | backend | Inventory/Stock | 791 | - | Y |
| `supabase/migrations/20260821400000_salary_rpcs_and_staff_rates_schema_fixes.sql` | migration | backend | Salary/Payroll | 258 | - | Y |
| `supabase/migrations/20260821500000_fix_notifications_rls_and_insert_policy.sql` | migration | backend | Notifications | 39 | - | Y |
| `supabase/migrations/20260821600000_inventory_stock_lifecycle_fixes.sql` | migration | backend | Inventory/Stock | 371 | - | Y |
| `supabase/migrations/20260821700000_add_user_last_login_at.sql` | migration | backend | Auth/Staff | 25 | - | Y |
| `supabase/migrations/20260822000000_record_payment_rpc.sql` | migration | backend | Billing/Payments | 141 | - | Y |
| `supabase/migrations/20260822010000_phase2_optimizations.sql` | migration | backend | Common | 91 | - | Y |
| `supabase/migrations/20260822020000_remove_duplicate_notification_triggers.sql` | migration | backend | Notifications | 6 | - | Y |
| `supabase/migrations/20260822030000_cleanup_old_webhooks.sql` | migration | backend | Common | 17 | - | Y |
| `supabase/migrations/20260822100000_itemized_billing_enhancements.sql` | migration | backend | Billing/Payments | 438 | - | Y |
| `supabase/migrations/20260822100001_job_type_technician_flow.sql` | migration | backend | Jobs | 119 | - | Y |
| `supabase/migrations/20260822110000_multi_technician_equal_incentive.sql` | migration | backend | Common | 184 | - | Y |
| `supabase/migrations/20260822120000_drop_old_search_customers.sql` | migration | backend | Customers | 4 | - | Y |
| `supabase/migrations/20260822120001_drop_search_query_function.sql` | migration | backend | Common | 3 | - | Y |
| `supabase/migrations/20260822120002_search_customers_v2.sql` | migration | backend | Customers | 57 | - | Y |
| `supabase/migrations/20260822120003_search_customers_v2_fix.sql` | migration | backend | Customers | 57 | - | Y |
| `supabase/migrations/20260822120004_record_payment_partial_status.sql` | migration | backend | Billing/Payments | 141 | - | Y |
| `supabase/migrations/20260822120005_expenditure_links.sql` | migration | backend | Expenditure | 308 | - | Y |
| `supabase/migrations/20260822140000_profile_pictures_and_avatars.sql` | migration | backend | Common | 81 | - | Y |
| `supabase/migrations/20260822150000_fix_invoices_and_sales_status_check.sql` | migration | backend | Sales | 493 | - | Y |
| `supabase/migrations/20260822160000_add_tax_columns_to_items.sql` | migration | backend | Common | 31 | - | Y |
| `supabase/migrations/20260903000000_get_job_status_counts_rpc.sql` | migration | backend | Jobs | 36 | - | Y |
| `supabase/migrations/20260903100000_customer_whatsapp_notifications.sql` | migration | backend | Customers | 168 | - | Y |
| `supabase/migrations/20260904120000_fix_inventory_stock_quantity_and_invoice_rpcs.sql` | migration | backend | Inventory/Stock | 526 | - | Y |
| `supabase/migrations/20260905151500_fix_search_customers_v2.sql` | migration | backend | Customers | 112 | - | Y |
| `supabase/migrations/20260905163600_ledger_system_phase1_schema.sql` | migration | backend | Customers | 529 | - | Y |
| `supabase/migrations/20260905170000_ledger_system_phase2_rpc.sql` | migration | backend | Customers | 596 | - | Y |
| `supabase/migrations/20260906163500_performance_phase1_indexes.sql` | migration | backend | Common | 122 | - | Y |
| `supabase/migrations/20260906165500_performance_phase2_pending_invoices_rpc.sql` | migration | backend | Billing/Payments | 85 | - | Y |
| `supabase/migrations/20260906180000_serial_number_inventory_tracking.sql` | migration | backend | Inventory/Stock | 810 | - | Y |
| `supabase/migrations/20260906190000_update_purchase_history_multi_item.sql` | migration | backend | Inventory/Stock | 121 | - | Y |
| `supabase/migrations/20260906191000_enhance_claim_invoice_serials_line_index.sql` | migration | backend | Inventory/Stock | 111 | - | Y |
| `supabase/migrations/20260909101500_onsite_arrival_checkin_rpc.sql` | migration | backend | Common | 74 | - | Y |
| `supabase/migrations/20260909103000_admin_manage_staff_status_rpc.sql` | migration | backend | Auth/Staff | 111 | - | Y |
| `supabase/migrations/20260909130000_fix_user_fk_for_force_delete.sql` | migration | backend | Auth/Staff | 166 | - | Y |
| `supabase/migrations/20260909130001_update_admin_manage_staff_status_simplified.sql` | migration | backend | Auth/Staff | 117 | - | Y |
| `supabase/migrations/20260909143000_rename_job_code_prefix_to_ds.sql` | migration | backend | Jobs | 31 | - | Y |
| `supabase/migrations/20260917120000_reconcile_payroll_leave_engine.sql` | migration | backend | Salary/Payroll | 19 | - | Y |
| `supabase/migrations/20260918000001_add_update_invoice_rpc.sql` | migration | backend | Billing/Payments | 338 | - | Y |
| `supabase/migrations/20260918000002_consolidate_stock_columns.sql` | migration | backend | Inventory/Stock | 84 | - | Y |
| `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql` | migration | backend | Attendance | 419 | - | Y |
| `types.ts` | type | shared | Common | 2343 | - | N |
