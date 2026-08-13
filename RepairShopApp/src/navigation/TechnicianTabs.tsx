import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TechnicianJobsStack from './TechnicianJobsStack';
import CustomTabBar from './CustomTabBar';
import AttendanceScreen from '../screens/shared/AttendanceScreen';
import TechnicianDashboardScreen from '../screens/technician/TechnicianDashboardScreen';
import SalaryScreen from '../screens/shared/SalaryScreen';
import { colors } from '../tokens';

const Tab = createBottomTabNavigator();

export default function TechnicianTabs() {
  return (
    <Tab.Navigator 
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={TechnicianDashboardScreen} />
      <Tab.Screen name="Jobs" component={TechnicianJobsStack} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Salary" component={SalaryScreen} />
    </Tab.Navigator>
  );
}
