const fs = require('fs');
const path = require('path');

// Extract details for every screen in RepairShopApp
const mobileScreens = [
  'RepairShopApp/src/screens/auth/LoginScreen.tsx',
  'RepairShopApp/src/screens/admin/OverviewScreen.tsx',
  'RepairShopApp/src/screens/admin/AdminJobsScreen.tsx',
  'RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx',
  'RepairShopApp/src/screens/admin/AdminCreateStaffScreen.tsx',
  'RepairShopApp/src/screens/admin/StaffScreen.tsx',
  'RepairShopApp/src/screens/admin/SalaryScreen.tsx',
  'RepairShopApp/src/screens/admin/ExpenditureScreen.tsx',
  'RepairShopApp/src/screens/admin/PurchaseIntakeScreen.tsx',
  'RepairShopApp/src/screens/admin/ReportsScreen.tsx',
  'RepairShopApp/src/screens/receptionist/DashboardScreen.tsx',
  'RepairShopApp/src/screens/receptionist/CustomerIntakeScreen.tsx',
  'RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx',
  'RepairShopApp/src/screens/receptionist/JobListScreen.tsx',
  'RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx',
  'RepairShopApp/src/screens/receptionist/BillingScreen.tsx',
  'RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx',
  'RepairShopApp/src/screens/receptionist/CustomersScreen.tsx',
  'RepairShopApp/src/screens/receptionist/AnalyticsScreen.tsx',
  'RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx',
  'RepairShopApp/src/screens/technician/MyJobsScreen.tsx',
  'RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx',
  'RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx',
  'RepairShopApp/src/screens/technician/AllottedMaterialsScreen.tsx',
  'RepairShopApp/src/screens/technician/TechnicianReportsScreen.tsx',
  'RepairShopApp/src/screens/shared/AttendanceScreen.tsx',
  'RepairShopApp/src/screens/shared/InventoryScreen.tsx',
  'RepairShopApp/src/screens/shared/SalesListScreen.tsx',
  'RepairShopApp/src/screens/shared/SaleDetailScreen.tsx',
  'RepairShopApp/src/screens/shared/PendingPaymentsScreen.tsx',
  'RepairShopApp/src/screens/shared/SalaryScreen.tsx',
  'RepairShopApp/src/screens/shared/NotificationsScreen.tsx',
  'RepairShopApp/src/screens/shared/ProfileScreen.tsx',
  'RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx',
  'RepairShopApp/src/screens/shared/InactiveUserScreen.tsx',
  'RepairShopApp/src/screens/shared/LoadingScreen.tsx'
];

const screenDetails = [];

mobileScreens.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  const code = fs.readFileSync(filePath, 'utf8');
  const lines = code.split('\n');
  
  // Find imports
  const imports = lines.filter(l => l.startsWith('import '));
  // Find Supabase queries (.from, .rpc, .functions)
  const queries = lines.filter(l => l.includes('supabase.from(') || l.includes('supabase.rpc(') || l.includes('supabase.functions.invoke('));
  // Find state declarations (useState, useReducer)
  const stateHooks = lines.filter(l => l.includes('useState(') || l.includes('useReducer('));
  
  screenDetails.push({
    file: filePath,
    lineCount: lines.length,
    queries: queries.map(q => q.trim()),
    stateCount: stateHooks.length
  });
});

fs.writeFileSync('mobile_screens_summary.json', JSON.stringify(screenDetails, null, 2));
console.log('Mobile screens summary written. Total:', screenDetails.length);
