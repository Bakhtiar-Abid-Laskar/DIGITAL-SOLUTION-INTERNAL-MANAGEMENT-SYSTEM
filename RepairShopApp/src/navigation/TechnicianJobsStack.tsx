import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyJobsScreen from '../screens/technician/MyJobsScreen';
import OnsiteVisitScreen from '../screens/technician/OnsiteVisitScreen';
import UpdateWorkScreen from '../screens/technician/UpdateWorkScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import AttendanceScreen from '../screens/shared/AttendanceScreen';

import ProfileScreen from '../screens/shared/ProfileScreen';
import AllottedMaterialsScreen from '../screens/technician/AllottedMaterialsScreen';

const Stack = createNativeStackNavigator();

export default function TechnicianJobsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyJobsList" component={MyJobsScreen} />
      <Stack.Screen name="OnsiteVisit" component={OnsiteVisitScreen} />
      <Stack.Screen name="UpdateWork" component={UpdateWorkScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="AllottedMaterials" component={AllottedMaterialsScreen} />
    </Stack.Navigator>
  );
}
