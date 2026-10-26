import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';

import LoadingScreen from '../screens/shared/LoadingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import InactiveUserScreen from '../screens/shared/InactiveUserScreen';

import AdminStack from './AdminStack';
import ReceptionistStack from './ReceptionistStack';
import TechnicianStack from './TechnicianStack';
import { usePushNotifications } from '../hooks/usePushNotifications';

const Stack = createNativeStackNavigator();

import { navigationRef } from './navigationRef';

const linking = {
  prefixes: [
    'repairshop://',
    ...(typeof window !== 'undefined' ? [window.location.origin, '/'] : ['/']),
  ],
  config: {
    screens: {
      ResetPassword: 'reset-password',
      Auth: 'login',
      Inactive: 'inactive',
      AdminRoot: {
        screens: {
          AdminTabs: {
            screens: {
              Dashboard: 'admin',
              Jobs: 'admin/jobs',
              Inventory: 'admin/inventory',
              Sales: 'admin/sales',
            },
          },
          AdminJobDetail: 'admin/jobs/:jobId',
          JobDetail: 'jobs/:jobId',
          Salary: 'admin/salary',
          Expenditure: 'admin/expenditure',
          AdminCreateStaff: 'admin/staff/new',
          Attendance: 'attendance',
          ProfileScreen: 'profile',
          Profile: 'profile-settings',
          Notifications: 'notifications',
          CustomerIntake: 'customer-intake',
          JobAssignment: 'job-assignment',
          NewSaleScreen: 'sales/new',
          Inventory: 'inventory',
          Customers: 'customers',
          AllottedMaterialsScreen: 'allotted-materials',
          SalesList: 'sales',
          SaleDetail: 'sales/:invoiceId',
          Billing: 'billing/:jobId?',
          PendingPayments: 'pending-payments',
          Users: 'admin/staff',
          Reports: 'admin/reports',
          PurchaseIntake: 'admin/purchases/new',
          StaffAttendanceOverview: 'admin/attendance-overview',
        },
      },
      ReceptionistRoot: {
        screens: {
          ReceptionistTabs: {
            screens: {
              Dashboard: 'receptionist',
              Jobs: 'receptionist/jobs',
              Attendance: 'attendance',
            },
          },
          CustomerIntake: 'receptionist/customer-intake',
          JobAssignment: 'receptionist/job-assignment',
          JobDetail: 'jobs/:jobId',
          Billing: 'billing/:jobId?',
          NewSaleScreen: 'sales/new',
          AnalyticsScreen: 'analytics',
          InventoryScreen: 'inventory',
          ProfileScreen: 'profile',
          Profile: 'profile-settings',
          Notifications: 'notifications',
          Customers: 'customers',
          AllottedMaterialsScreen: 'allotted-materials',
          SalesList: 'sales',
          SaleDetail: 'sales/:invoiceId',
          PendingPayments: 'pending-payments',
        },
      },
      TechnicianRoot: {
        screens: {
          TechnicianTabs: {
            screens: {
              Dashboard: 'technician',
              MyJobs: 'technician/jobs',
              Attendance: 'attendance',
            },
          },
          OnsiteVisit: 'onsite-visit',
          UpdateWork: 'work/:jobId?',
          Notifications: 'notifications',
          ProfileScreen: 'profile',
          Profile: 'profile-settings',
          AllottedMaterialsScreen: 'allotted-materials',
          TechnicianReports: 'technician/reports',
        },
      },
      Fallback: '*',
    },
  },
};

export default function RootNavigator() {
  const { session, role, isActive, isLoading, isPasswordRecovery } = useAuth();
  
  // Register for push notifications if the user is authenticated
  usePushNotifications();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      documentTitle={{
        formatter: (options, route) => {
          const title = options?.title || route?.name || 'Home';
          return `${title} | Digital Solution`;
        },
      }}
    >
      {/* Global status bar — dark icons on white/light backgrounds */}
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isPasswordRecovery ? (
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        ) : !session ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : !isActive ? (
          <Stack.Screen name="Inactive" component={InactiveUserScreen} />
        ) : role === 'admin' ? (
          <Stack.Screen name="AdminRoot" component={AdminStack} />
        ) : role === 'receptionist' ? (
          <Stack.Screen name="ReceptionistRoot" component={ReceptionistStack} />
        ) : role === 'technician' ? (
          <Stack.Screen name="TechnicianRoot" component={TechnicianStack} />
        ) : (
          <Stack.Screen name="Fallback" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
