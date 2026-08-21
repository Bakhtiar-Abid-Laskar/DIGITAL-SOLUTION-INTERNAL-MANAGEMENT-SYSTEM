import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  BarChart3,
  AlertTriangle,
  AlertCircle,
  Info,
  ClipboardList,
  Users,
  Package,
  CheckCircle,
  Activity,
  Menu,
  Bell,
  User,
  LogOut,
  Banknote,
  TrendingDown,
  MessageCircle,
  Mail,
  CreditCard,
} from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '@repairshop/shared';
import { colors, radius, spacing, typography, shadow, QUICK_ACTION_COLORS } from '../../tokens';
import RoleDashboard, { StatCard, QuickAction } from '../../components/shared/RoleDashboard';
import BottomSheet from '../../components/common/BottomSheet';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function OverviewScreen() {
  const { user, signOut, displayName } = useAuth();
  const navigation = useNavigation<any>();

  const [activeJobs, setActiveJobs] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);
  const [staffPresent, setStaffPresent] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [urgentJobsCount, setUrgentJobsCount] = useState<number>(0);

  const [logoutVisible, setLogoutVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationsData, setNotificationsData] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(5);
      if (!error && data) setNotificationsData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [jobsRes, billsRes, staffRes, stockRes, urgentRes, unreadRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .not('status', 'in', '("Completed","Delivered","Cancelled")'),
        supabase
          .from('billing')
          .select('grand_total')
          .gte('created_at', `${today}T00:00:00Z`),
        supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', today)
          .not('check_in_time', 'is', null),
        supabase
          .rpc('count_low_stock_items'),
        supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('priority', 'Urgent')
          .eq('status', 'Received'),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_user_id', user?.id),
      ]);

      const rev = (billsRes.data || []).reduce((sum, b) => sum + (b.grand_total || 0), 0);

      setActiveJobs(jobsRes.count || 0);
      setRevenue(rev);
      setStaffPresent(staffRes.count || 0);
      setLowStockCount(Number(stockRes.data) || 0);
      setUrgentJobsCount(urgentRes.count || 0);
      setUnreadCount(unreadRes.count || 0);
    } catch (err) {
      console.log('Error fetching admin stats:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      fetchNotifications();
    }, [user])
  );

  const confirmLogout = async () => {
    setLogoutVisible(false);
    if (typeof signOut === 'function') {
      await signOut();
    } else {
      await supabase.auth.signOut();
    }
  };

  const stats: StatCard[] = [
    { id: 'jobs', label: 'Active Jobs', value: activeJobs, type: 'total', icon: ClipboardList, onPress: () => navigation.navigate('Jobs') },
    { id: 'staff', label: 'Staff Present', value: staffPresent, type: 'progress', icon: Users, onPress: () => navigation.navigate('Users') },
    { id: 'stock', label: 'Low Stock', value: lowStockCount, type: 'urgent', icon: AlertTriangle, onPress: () => navigation.navigate('Inventory') },
    { id: 'rev', label: "Today's Revenue", value: formatCurrency(revenue), type: 'completed', icon: CheckCircle },
  ];

  const quickActions: QuickAction[] = [
    { id: 'new_job', label: 'New Job', icon: ClipboardList, bgColor: QUICK_ACTION_COLORS.blueTile.bg, iconColor: QUICK_ACTION_COLORS.blueTile.fg, onPress: () => navigation.navigate('CustomerIntake') },
    { id: 'sales', label: 'Sales', icon: Banknote, bgColor: QUICK_ACTION_COLORS.tealTile.bg, iconColor: QUICK_ACTION_COLORS.tealTile.fg, onPress: () => navigation.navigate('SalesList') },
    { id: 'pending_payments', label: 'Pending Payments', icon: CreditCard, bgColor: '#FFF4E5', iconColor: '#E65100', onPress: () => navigation.navigate('PendingPayments') },
    { id: 'allotted_materials', label: 'Allotted Materials', icon: Package, bgColor: QUICK_ACTION_COLORS.orangeTile.bg, iconColor: QUICK_ACTION_COLORS.orangeTile.fg, onPress: () => navigation.navigate('AllottedMaterialsScreen', { mode: 'all' }) },
    { id: 'users', label: 'Staff', icon: Users, bgColor: QUICK_ACTION_COLORS.tealTile.bg, iconColor: QUICK_ACTION_COLORS.tealTile.fg, onPress: () => navigation.navigate('Users') },
    { id: 'inventory', label: 'Inventory', icon: Package, bgColor: QUICK_ACTION_COLORS.orangeTile.bg, iconColor: QUICK_ACTION_COLORS.orangeTile.fg, onPress: () => navigation.navigate('Inventory') },
    { id: 'reports', label: 'Reports', icon: BarChart3, bgColor: QUICK_ACTION_COLORS.purpleTile.bg, iconColor: QUICK_ACTION_COLORS.purpleTile.fg, onPress: () => navigation.navigate('Reports') },
    { id: 'salary', label: 'Salary', icon: Banknote, bgColor: QUICK_ACTION_COLORS.greenTile.bg, iconColor: QUICK_ACTION_COLORS.greenTile.fg, onPress: () => navigation.navigate('Salary') },
    { id: 'expenditure', label: 'Expenditure', icon: TrendingDown, bgColor: QUICK_ACTION_COLORS.redTile.bg, iconColor: QUICK_ACTION_COLORS.redTile.fg, onPress: () => navigation.navigate('Expenditure') },
  ];

  return (
    <View style={styles.container}>
      <RoleDashboard
        roleTitle="Admin Dashboard"
        userName={displayName || 'Admin'}
        workloadText={urgentJobsCount > 0 ? `${urgentJobsCount} urgent jobs need attention` : 'All systems normal'}
        bannerColor={colors.accentBlue}
        avatarElement={<BarChart3 size={24} color={colors.textInverse} />}
        stats={stats}
        quickActions={quickActions}
        headerLeftIcon={<Bell size={22} color={colors.textSecondary} />}
        onHeaderLeftPress={() => setNotificationsVisible(true)}
        headerRightIcon={<Menu size={22} color={colors.textSecondary} />}
        onHeaderRightPress={() => setMenuVisible(true)}
        unreadCount={unreadCount}
      >
        {/* ALERTS SECTION */}
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          <View style={styles.alertsContainer}>
            {urgentJobsCount > 0 && (
              <AppPressable style={styles.alertCard} onPress={() => navigation.navigate('Jobs')}>
                <View style={[styles.alertIconBox, { backgroundColor: colors.statusUrgentBg }]}>
                  <AlertTriangle size={20} color={colors.statusUrgentFg} />
                </View>
                <Text style={styles.alertText}>{urgentJobsCount} urgent jobs waiting to be assigned.</Text>
              </AppPressable>
            )}
            {lowStockCount > 0 && (
              <AppPressable style={styles.alertCard} onPress={() => navigation.navigate('Inventory')}>
                <View style={[styles.alertIconBox, { backgroundColor: colors.statusWaitingBg }]}>
                  <AlertCircle size={20} color={colors.statusWaitingFg} />
                </View>
                <Text style={styles.alertText}>{lowStockCount} inventory items are below threshold.</Text>
              </AppPressable>
            )}
            {urgentJobsCount === 0 && lowStockCount === 0 && (
              <View style={styles.alertCard}>
                <View style={[styles.alertIconBox, { backgroundColor: colors.statusCompletedBg }]}>
                  <Info size={20} color={colors.statusCompletedFg} />
                </View>
                <Text style={styles.alertText}>All systems normal. No pending alerts.</Text>
              </View>
            )}
          </View>
        </View>
      </RoleDashboard>

      {/* Notifications Bottom Sheet */}
      <BottomSheet visible={notificationsVisible} onClose={() => setNotificationsVisible(false)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, paddingHorizontal: spacing.md }}>
          <Text style={typography.h2}>Notifications</Text>
        </View>
        <ScrollView style={{ maxHeight: 400, paddingBottom: spacing.xl, paddingHorizontal: spacing.md }}>
          {notificationsData.length === 0 ? (
            <EmptyState
              icon={Bell}
              message="No new notifications"
              subMessage="You're all caught up!"
              compact={true}
            />
          ) : (
            notificationsData.map(notif => (
              <AppPressable key={notif.id} style={styles.notificationCard}>
                <View style={styles.notificationIcon}>
                  {notif.channel === 'whatsapp' ? (
                    <MessageCircle size={20} color={colors.accentGreen} />
                  ) : notif.channel === 'email' ? (
                    <Mail size={20} color={colors.accentBlue} />
                  ) : (
                    <Bell size={20} color={colors.primary} />
                  )}
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationMessage} numberOfLines={2}>{notif.message}</Text>
                  <Text style={styles.notificationTime}>{formatTime(notif.sent_at)}</Text>
                </View>
              </AppPressable>
            ))
          )}
        </ScrollView>
      </BottomSheet>

      {/* Menu Bottom Sheet */}
      <BottomSheet visible={menuVisible} onClose={() => setMenuVisible(false)}>
        <Text style={{ ...typography.h2, marginBottom: spacing.md }}>Menu</Text>
        <AppPressable
          style={styles.menuItem}
          onPress={() => {
            setMenuVisible(false);
            // Profile navigation placeholder — will be wired in Phase 2
          }}
        >
          <User size={20} color={colors.textPrimary} style={{ marginRight: spacing.md }} />
          <Text style={styles.menuItemText}>Profile</Text>
        </AppPressable>
        <AppPressable
          style={styles.menuItem}
          onPress={() => {
            setMenuVisible(false);
            setTimeout(() => setLogoutVisible(true), 300);
          }}
        >
          <LogOut size={20} color={colors.accentRed} style={{ marginRight: spacing.md }} />
          <Text style={[styles.menuItemText, { color: colors.accentRed }]}>Log Out</Text>
        </AppPressable>
      </BottomSheet>

      {/* Logout Confirmation */}
      <BottomSheet visible={logoutVisible} onClose={() => setLogoutVisible(false)}>
        <Text style={{ ...typography.h2, marginBottom: spacing.sm }}>Log Out</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}>
          Are you sure you want to sign out of your admin session?
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label="Cancel" variant="secondary" onPress={() => setLogoutVisible(false)} style={{ flex: 1 }} />
          <Button label="Sign Out" onPress={confirmLogout} style={{ flex: 1, backgroundColor: colors.accentRed }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  alertsSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  alertsContainer: {
    gap: spacing.md,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  alertIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  alertText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  notificationCard: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  notificationTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
