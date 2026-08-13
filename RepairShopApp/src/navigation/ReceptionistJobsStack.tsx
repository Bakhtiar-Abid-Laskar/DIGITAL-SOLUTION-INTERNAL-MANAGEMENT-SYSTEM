import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import JobListScreen from '../screens/receptionist/JobListScreen';
import JobDetailScreen from '../screens/receptionist/JobDetailScreen';
import BillingScreen from '../screens/receptionist/BillingScreen';
import CustomerIntakeScreen from '../screens/receptionist/CustomerIntakeScreen';
import JobAssignmentScreen from '../screens/receptionist/JobAssignmentScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import AttendanceScreen from '../screens/shared/AttendanceScreen';
import NewSaleScreen from '../screens/receptionist/NewSaleScreen';
import AnalyticsScreen from '../screens/receptionist/AnalyticsScreen';
import InventoryScreen from '../screens/shared/InventoryScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';


const Stack = createNativeStackNavigator();

export default function ReceptionistJobsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="JobList" component={JobListScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="CustomerIntake" component={CustomerIntakeScreen} />
      <Stack.Screen name="JobAssignment" component={JobAssignmentScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="NewSaleScreen" component={NewSaleScreen} />
      <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
      <Stack.Screen name="InventoryScreen" component={InventoryScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
