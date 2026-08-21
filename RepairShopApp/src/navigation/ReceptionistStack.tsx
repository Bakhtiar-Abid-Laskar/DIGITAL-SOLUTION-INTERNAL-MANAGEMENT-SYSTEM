import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ReceptionistTabs from './ReceptionistTabs';
import CustomerIntakeScreen from '../screens/receptionist/CustomerIntakeScreen';
import JobAssignmentScreen from '../screens/receptionist/JobAssignmentScreen';
import JobDetailScreen from '../screens/receptionist/JobDetailScreen';
import BillingScreen from '../screens/receptionist/BillingScreen';
import NewSaleScreen from '../screens/receptionist/NewSaleScreen';
import AnalyticsScreen from '../screens/receptionist/AnalyticsScreen';
import InventoryScreen from '../screens/shared/InventoryScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import CustomersScreen from '../screens/receptionist/CustomersScreen';
import AllottedMaterialsScreen from '../screens/shared/AllottedMaterialsScreen';
import SalesListScreen from '../screens/shared/SalesListScreen';
import SaleDetailScreen from '../screens/shared/SaleDetailScreen';
import PendingPaymentsScreen from '../screens/shared/PendingPaymentsScreen';

const Stack = createNativeStackNavigator();

export default function ReceptionistStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReceptionistTabs" component={ReceptionistTabs} />
      <Stack.Screen name="CustomerIntake" component={CustomerIntakeScreen} />
      <Stack.Screen name="JobAssignment" component={JobAssignmentScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="NewSaleScreen" component={NewSaleScreen} />
      <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
      <Stack.Screen name="InventoryScreen" component={InventoryScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Customers" component={CustomersScreen} />
      <Stack.Screen name="AllottedMaterialsScreen" component={AllottedMaterialsScreen} />
      <Stack.Screen name="SalesList" component={SalesListScreen} />
      <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
      <Stack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
    </Stack.Navigator>
  );
}
