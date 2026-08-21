import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminTabs from './AdminTabs';
import AdminJobDetailScreen from '../screens/admin/AdminJobDetailScreen';
import SalaryScreen from '../screens/admin/SalaryScreen';
import ExpenditureScreen from '../screens/admin/ExpenditureScreen';
import AdminCreateStaffScreen from '../screens/admin/AdminCreateStaffScreen';
import AttendanceScreen from '../screens/shared/AttendanceScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import CustomerIntakeScreen from '../screens/receptionist/CustomerIntakeScreen';
import NewSaleScreen from '../screens/receptionist/NewSaleScreen';
import InventoryScreen from '../screens/shared/InventoryScreen';
import CustomersScreen from '../screens/receptionist/CustomersScreen';
import AllottedMaterialsScreen from '../screens/shared/AllottedMaterialsScreen';
import SalesListScreen from '../screens/shared/SalesListScreen';
import SaleDetailScreen from '../screens/shared/SaleDetailScreen';
import PendingPaymentsScreen from '../screens/shared/PendingPaymentsScreen';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main tabs — always the root */}
      <Stack.Screen name="AdminTabs" component={AdminTabs} />

      {/* Detail / modal screens pushed over tabs */}
      <Stack.Screen name="AdminJobDetail" component={AdminJobDetailScreen} />
      <Stack.Screen name="Salary" component={SalaryScreen} />
      <Stack.Screen name="Expenditure" component={ExpenditureScreen} />
      <Stack.Screen name="AdminCreateStaff" component={AdminCreateStaffScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="CustomerIntake" component={CustomerIntakeScreen} />
      <Stack.Screen name="NewSaleScreen" component={NewSaleScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="Customers" component={CustomersScreen} />
      <Stack.Screen name="AllottedMaterialsScreen" component={AllottedMaterialsScreen} />
      <Stack.Screen name="SalesList" component={SalesListScreen} />
      <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
      <Stack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
    </Stack.Navigator>
  );
}

