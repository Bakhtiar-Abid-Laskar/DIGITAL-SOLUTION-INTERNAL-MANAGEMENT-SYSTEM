import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '../components/common/AppPressable';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import OverviewScreen from '../screens/admin/OverviewScreen';
import InventoryScreen from '../screens/shared/InventoryScreen';
import StaffScreen from '../screens/admin/StaffScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import AdminJobsScreen from '../screens/admin/AdminJobsScreen';
import CustomTabBar from './CustomTabBar';
import BottomSheet from '../components/common/BottomSheet';
import { Plus, DollarSign } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '../tokens';

const Tab = createBottomTabNavigator();

// Empty placeholder — FAB doesn't navigate to a real screen
function FabPlaceholderScreen() {
  return null;
}

export default function AdminTabs() {
  const [quickActionsVisible, setQuickActionsVisible] = React.useState(false);
  const navigation = useNavigation<any>();

  return (
    <>
      <Tab.Navigator 
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Overview" component={OverviewScreen} />
        <Tab.Screen name="Jobs" component={AdminJobsScreen} />
        <Tab.Screen
          name="Add"
          component={FabPlaceholderScreen}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              setQuickActionsVisible(true);
            },
          })}
        />
        <Tab.Screen name="Users" component={StaffScreen} />
        <Tab.Screen name="Reports" component={ReportsScreen} />
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

          <AppPressable
            style={styles.quickActionCard}
            onPress={() => {
              setQuickActionsVisible(false);
              navigation.navigate('SalesList');
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.accentTeal + '20' }]}>
              <DollarSign color={colors.accentTeal} size={24} />
            </View>
            <View>
              <Text style={typography.h3}>Sales</Text>
              <Text style={typography.caption}>View all completed jobs and sales</Text>
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
  },
});

