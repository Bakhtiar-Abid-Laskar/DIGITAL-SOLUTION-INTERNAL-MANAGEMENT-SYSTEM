import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '../components/common/AppPressable';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/receptionist/DashboardScreen';
import ReceptionistJobsStack from './ReceptionistJobsStack';
import CustomTabBar from './CustomTabBar';
import AttendanceScreen from '../screens/shared/AttendanceScreen';
import SalaryScreen from '../screens/shared/SalaryScreen';
import { colors, typography, spacing, radius } from '../tokens';

import BottomSheet from '../components/common/BottomSheet';
import { Plus, DollarSign, Wrench } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

// Empty screen component since the FAB doesn't actually route anywhere
function FabPlaceholderScreen() {
  return null;
}

export default function ReceptionistTabs() {
  const [quickActionsVisible, setQuickActionsVisible] = React.useState(false);
  const navigation = useNavigation<any>();

  return (
    <>
      <Tab.Navigator 
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Jobs" component={ReceptionistJobsStack} />
        <Tab.Screen 
          name="New Job" 
          component={FabPlaceholderScreen} 
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              setQuickActionsVisible(true);
            },
          })}
        />
        <Tab.Screen name="Attendance" component={AttendanceScreen} />
        <Tab.Screen name="Salary" component={SalaryScreen} />
      </Tab.Navigator>

      <BottomSheet visible={quickActionsVisible} onClose={() => setQuickActionsVisible(false)}>
        <Text style={{ ...typography.h2, marginBottom: spacing.md, paddingHorizontal: spacing.md }}>Quick Actions</Text>
        <View style={{ paddingBottom: spacing.xl, paddingHorizontal: spacing.md, gap: spacing.md }}>
          <AppPressable 
            style={styles.quickActionCard}
            onPress={() => {
              setQuickActionsVisible(false);
              navigation.navigate('CustomerIntake');
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.accentBlue + '20' }]}>
              <Plus color={colors.accentBlue} size={24} />
            </View>
            <View>
              <Text style={typography.h3}>New Job</Text>
              <Text style={typography.caption}>Intake a device for repair</Text>
            </View>
          </AppPressable>

          <AppPressable 
            style={styles.quickActionCard}
            onPress={() => {
              setQuickActionsVisible(false);
              navigation.navigate('NewSaleScreen');
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.accentGreen + '20' }]}>
              <DollarSign color={colors.accentGreen} size={24} />
            </View>
            <View>
              <Text style={typography.h3}>New Sale</Text>
              <Text style={typography.caption}>Sell an accessory or part</Text>
            </View>
          </AppPressable>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
