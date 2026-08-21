import React, { useCallback, useState, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { getTodayDateString } from '@repairshop/shared';
import { useAuth } from '../../context/AuthContext';
import RoleDashboard, { QuickAction, StatCard } from '../../components/shared/RoleDashboard';
import { Plus, ClipboardList, Users, Bell, LogOut, User, CheckCircle, AlertTriangle, Activity, Menu, DollarSign, BarChart3, Package, MessageCircle, Mail, FileText, CreditCard } from 'lucide-react-native';
import { useToast } from '../../context/ToastContext';
import BottomSheet from '../../components/common/BottomSheet';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { typography, spacing, radius, colors, QUICK_ACTION_COLORS } from '../../tokens';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
// Helper for formatting time
const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { signOut, user, displayName } = useAuth();

  const [loading, setLoading] = useState(true);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsData, setNotificationsData] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isFirstMount = useRef(true);
  const { showToast } = useToast();

  const [statsData, setStatsData] = useState({
    todayTotal: 0,
    inProgress: 0,
    completedToday: 0,
    urgentPending: 0,
  });

  const handleLogout = () => {
    setLogoutVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutVisible(false);
    if (typeof signOut === 'function') {
      await signOut();
    } else {
      await supabase.auth.signOut();
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setNotificationsData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboardData = async (isRefresh = false) => {
    try {

      const [receivedRes, inProgressRes, completedRes, urgentRes, unreadRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Received'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'In Progress'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Completed'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('priority', 'Urgent').neq('status', 'Completed'),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_user_id', user?.id),
      ]);

      setStatsData({
        todayTotal:    receivedRes.count   ?? 0,
        inProgress:    inProgressRes.count ?? 0,
        completedToday:completedRes.count  ?? 0,
        urgentPending: urgentRes.count     ?? 0,
      });
      setUnreadCount(unreadRes.count ?? 0);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useRealtimeSubscription('jobs', fetchDashboardData);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(false).then(() => {
        isFirstMount.current = false;
      });
      fetchNotifications();
    }, [])
  );

  const navigateToJobs = (filterType: string) => {
    navigation.navigate('Jobs', { screen: 'JobList', params: { filter: filterType } });
  };

  const quickActions: QuickAction[] = [
    { id: 'new_job', label: 'New Job', icon: Plus, bgColor: QUICK_ACTION_COLORS.blueTile.bg, iconColor: QUICK_ACTION_COLORS.blueTile.fg, onPress: () => navigation.navigate('CustomerIntake') },
    { id: 'new_sale', label: 'New Sale', icon: DollarSign, bgColor: QUICK_ACTION_COLORS.tealTile.bg, iconColor: QUICK_ACTION_COLORS.tealTile.fg, onPress: () => navigation.navigate('NewSaleScreen') },
    { id: 'sales', label: 'Sales', icon: FileText, bgColor: QUICK_ACTION_COLORS.greenTile?.bg || '#E6F4EA', iconColor: QUICK_ACTION_COLORS.greenTile?.fg || '#137333', onPress: () => navigation.navigate('SalesList') },
    { id: 'pending_payments', label: 'Pending Payments', icon: CreditCard, bgColor: '#FFF4E5', iconColor: '#E65100', onPress: () => navigation.navigate('PendingPayments') },
    { id: 'allotted_materials', label: 'Allotted Materials', icon: Package, bgColor: QUICK_ACTION_COLORS.orangeTile.bg, iconColor: QUICK_ACTION_COLORS.orangeTile.fg, onPress: () => navigation.navigate('AllottedMaterialsScreen', { mode: 'all' }) },
    { id: 'customers', label: 'Customers', icon: Users, bgColor: QUICK_ACTION_COLORS.purpleTile.bg, iconColor: QUICK_ACTION_COLORS.purpleTile.fg, onPress: () => navigation.navigate('Customers') },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, bgColor: QUICK_ACTION_COLORS.redTile.bg, iconColor: QUICK_ACTION_COLORS.redTile.fg, onPress: () => navigation.navigate('AnalyticsScreen') },
    { id: 'inventory', label: 'Inventory', icon: Package, bgColor: colors.surface, iconColor: colors.textPrimary, onPress: () => navigation.navigate('InventoryScreen') },
  ];

  const stats: StatCard[] = [
    { id: 'received', label: 'Received', value: loading ? '-' : statsData.todayTotal, type: 'total', icon: ClipboardList, onPress: () => navigateToJobs('Received') },
    { id: 'in_progress', label: 'In Progress', value: loading ? '-' : statsData.inProgress, type: 'progress', icon: Activity, onPress: () => navigateToJobs('In Progress') },
    { id: 'completed', label: 'Completed', value: loading ? '-' : statsData.completedToday, type: 'completed', icon: CheckCircle, onPress: () => navigateToJobs('Completed') },
    { id: 'urgent', label: 'Urgent', value: loading ? '-' : statsData.urgentPending, type: 'urgent', icon: AlertTriangle, onPress: () => navigateToJobs('Urgent') },
  ];

  return (
    <View style={styles.container}>
      <RoleDashboard
        roleTitle="Receptionist"
        userName={displayName}
        workloadText={statsData.urgentPending > 0 ? `${statsData.urgentPending} urgent jobs need attention` : 'All caught up'}
        bannerColor={colors.primary}
        avatarElement={<User color={colors.textInverse} size={24} />}
        quickActions={quickActions}
        stats={stats}
        headerLeftIcon={<Bell size={22} color={colors.textSecondary} />}
        onHeaderLeftPress={() => setNotificationsVisible(true)}
        headerRightIcon={<Menu size={22} color={colors.textSecondary} />}
        onHeaderRightPress={() => setMenuVisible(true)}
        unreadCount={unreadCount}
      />

      {/* Notifications Bottom Sheet */}
      <BottomSheet visible={notificationsVisible} onClose={() => setNotificationsVisible(false)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, paddingHorizontal: spacing.md }}>
          <Text style={typography.h2}>Notifications</Text>
          <AppPressable onPress={() => {
            setNotificationsVisible(false);
            navigation.navigate('Notifications');
          }}>
            <Text style={{ ...typography.bodyBold, color: colors.primary }}>See All</Text>
          </AppPressable>
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
            navigation.navigate('ProfileScreen');
          }}
        >
          <User size={20} color={colors.textPrimary} style={{ marginRight: spacing.md }} />
          <Text style={styles.menuItemText}>Profile</Text>
        </AppPressable>
        <AppPressable 
          style={styles.menuItem} 
          onPress={() => {
            setMenuVisible(false);
            setTimeout(() => {
              setLogoutVisible(true);
            }, 300);
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
          Are you sure you want to log out?
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label="Cancel" variant="secondary" onPress={() => setLogoutVisible(false)} style={{ flex: 1 }} />
          <Button label="Log Out" onPress={confirmLogout} style={{ flex: 1, backgroundColor: colors.accentRed }} />
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
