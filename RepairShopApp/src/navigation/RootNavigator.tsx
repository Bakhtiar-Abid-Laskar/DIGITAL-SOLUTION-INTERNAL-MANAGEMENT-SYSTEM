import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';

import LoadingScreen from '../screens/shared/LoadingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import InactiveUserScreen from '../screens/shared/InactiveUserScreen';

import AdminStack from './AdminStack';
import ReceptionistStack from './ReceptionistStack';
import TechnicianStack from './TechnicianStack';
import { usePushNotifications } from '../hooks/usePushNotifications';

const Stack = createNativeStackNavigator();

import { navigationRef } from './navigationRef';

export default function RootNavigator() {
  const { session, role, isActive, isLoading } = useAuth();
  
  // Register for push notifications if the user is authenticated
  usePushNotifications();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {/* Global status bar — dark icons on white/light backgrounds */}
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
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
