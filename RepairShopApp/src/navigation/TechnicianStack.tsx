import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TechnicianTabs from './TechnicianTabs';
import OnsiteVisitScreen from '../screens/technician/OnsiteVisitScreen';
import UpdateWorkScreen from '../screens/technician/UpdateWorkScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import AllottedMaterialsScreen from '../screens/shared/AllottedMaterialsScreen';

const Stack = createNativeStackNavigator();

export default function TechnicianStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TechnicianTabs" component={TechnicianTabs} />
      <Stack.Screen name="OnsiteVisit" component={OnsiteVisitScreen} />
      <Stack.Screen name="UpdateWork" component={UpdateWorkScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="AllottedMaterialsScreen" component={AllottedMaterialsScreen} />
    </Stack.Navigator>
  );
}
