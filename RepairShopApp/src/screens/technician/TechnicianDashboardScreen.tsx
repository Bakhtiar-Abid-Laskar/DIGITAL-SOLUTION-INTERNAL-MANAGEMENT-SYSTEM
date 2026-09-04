import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Switch } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { getTodayDateString } from '@repairshop/shared';
import { useAuth } from '../../context/AuthContext';
import { playNotificationSound } from '../../utils/playNotificationSound';
import RoleDashboard, { QuickAction, StatCard } from '../../components/shared/RoleDashboard';
import JobCard from '../../components/jobs/JobCard';
import { colors, QUICK_ACTION_COLORS, typography, spacing } from '../../tokens';
import {
  ClipboardList,
  CalendarCheck,
  LogOut,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Bell,
  Menu,
  User,
  Package,
  MessageCircle,
  Mail,
  BarChart3,
} from 'lucide-react-native';

import BottomSheet from '../../components/common/BottomSheet';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function TechnicianDashboardScreen() {
  const navigation = useNavigation<any>();
  const { signOut, user, displayName, avatarUrl } = useAuth();

  const [loading, setLoading] = useState(true);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsData, setNotificationsData] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isFirstMount = useRef(true);

  const [statsData, setStatsData] = useState({
    totalAssigned: 0,
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

  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      const today = getTodayDateString();
      const startOfToday = new Date(today + 'T00:00:00.000Z').toISOString();

      const [totalRes, inProgressRes, completedRes, urgentRes, unreadRes, activeJobsRes] = await Promise.all([
        supabase.from('jobs').select('id, job_technicians!inner(technician_id, removed_at)', { count: 'exact', head: true }).eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null),
        supabase.from('jobs').select('id, job_technicians!inner(technician_id, removed_at)', { count: 'exact', head: true }).eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null).in('status', ['In Progress', 'Waiting for Materials', 'Received']),
        supabase.from('jobs').select('id, job_technicians!inner(technician_id, removed_at)', { count: 'exact', head: true }).eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null).eq('status', 'Completed').gte('completed_at', startOfToday),
        supabase.from('jobs').select('id, job_technicians!inner(technician_id, removed_at)', { count: 'exact', head: true }).eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null).eq('priority', 'Urgent').neq('status', 'Completed'),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_user_id', user.id),
        supabase.from('jobs').select('*, job_technicians!inner(technician_id, removed_at)').eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null).neq('status', 'Completed').order('created_at', { ascending: false }).limit(20)
      ]);

      setStatsData({
        totalAssigned: totalRes.count ?? 0,
        inProgress: inProgressRes.count ?? 0,
        completedToday: completedRes.count ?? 0,
        urgentPending: urgentRes.count ?? 0,
      });
      setUnreadCount(unreadRes.count ?? 0);
      if (activeJobsRes.data) {
        setActiveJobs(activeJobsRes.data);
      }
    } catch (error) {
      console.error('Error fetching tech dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    let timeoutId: NodeJS.Timeout;
    const handleUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchDashboardData();
        playNotificationSound();
      }, 1500);
    };

    const channel = supabase
      .channel('tech-dashboard-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `technician_id=eq.${user.id}` }, handleUpdate)
      .subscribe();

    return () => { 
      clearTimeout(timeoutId);
      supabase.removeChannel(channel); 
    };
  }, [user]);

  const lastFetchTime = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (isFirstMount.current || now - lastFetchTime.current > 5 * 60 * 1000) {
        fetchDashboardData().then(() => {
          isFirstMount.current = false;
          lastFetchTime.current = Date.now();
        });
        fetchNotifications();
      }
    }, [user])
  );

  const navigateToJobs = (filterType: string) => {
    navigation.navigate('Jobs', { screen: 'MyJobs', params: { filter: filterType } });
  };

  const quickActions: QuickAction[] = [
    { id: 'materials', label: 'My Materials', icon: Package, bgColor: QUICK_ACTION_COLORS.orangeTile.bg, iconColor: QUICK_ACTION_COLORS.orangeTile.fg, onPress: () => navigation.navigate('AllottedMaterialsScreen', { mode: 'scoped' }) },
    { id: 'reports', label: 'Reports', icon: BarChart3, bgColor: QUICK_ACTION_COLORS.purpleTile.bg, iconColor: QUICK_ACTION_COLORS.purpleTile.fg, onPress: () => navigation.navigate('TechnicianReports') },
  ];

  const stats: StatCard[] = [
    { id: 'assigned', label: 'Total Assigned', value: loading ? '-' : statsData.totalAssigned, type: 'total', icon: ClipboardList, onPress: () => navigateToJobs('All') },
    { id: 'in_progress', label: 'In Progress', value: loading ? '-' : statsData.inProgress, type: 'progress', icon: Activity, onPress: () => navigateToJobs('In Progress') },
    { id: 'completed', label: 'Completed Today', value: loading ? '-' : statsData.completedToday, type: 'completed', icon: CheckCircle2, onPress: () => navigateToJobs('Completed') },
    { id: 'urgent', label: 'Urgent', value: loading ? '-' : statsData.urgentPending, type: 'urgent', icon: AlertTriangle, onPress: () => navigateToJobs('Urgent') },
  ];

  return (
    <View style={styles.container}>
      <RoleDashboard
        roleTitle="Technician Dashboard"
        userName={displayName}
        workloadText={statsData.urgentPending > 0 ? `${statsData.urgentPending} urgent jobs pending` : 'All caught up'}
        bannerColor={colors.accentGreen}
        avatarUrl={avatarUrl}
        avatarElement={<Wrench color={colors.textInverse} size={24} />}
        quickActions={quickActions}
        stats={stats}
        headerLeftIcon={<Bell size={22} color={colors.textSecondary} />}
        onHeaderLeftPress={() => setNotificationsVisible(true)}
        headerRightIcon={<Menu size={22} color={colors.textSecondary} />}
        onHeaderRightPress={() => setMenuVisible(true)}
        unreadCount={unreadCount}
      >
        <View style={{ marginBottom: spacing.xxl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>Your active tasks for today:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={{ ...typography.caption, color: colors.textSecondary }}>Urgent</Text>
              <Switch
                value={showUrgentOnly}
                onValueChange={setShowUrgentOnly}
                trackColor={{ false: colors.border, true: colors.statusUrgentBg }}
                thumbColor={showUrgentOnly ? colors.statusUrgentFg : colors.textMuted}
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>
          
          {activeJobs.filter(job => showUrgentOnly ? job.priority === 'Urgent' : true).length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              message={showUrgentOnly ? "No urgent active tasks." : "No active tasks today!"}
              subMessage="You're all caught up."
              compact={true}
            />
          ) : (
            activeJobs
              .filter(job => showUrgentOnly ? job.priority === 'Urgent' : true)
              .map(job => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  onPress={() => navigation.navigate('UpdateWork', { jobId: job.id })}
                />
              ))
          )}
        </View>
      </RoleDashboard>

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
              <AppPressable
                key={notif.id}
                style={styles.notificationCard}
                onPress={() => {
                  setNotificationsVisible(false);
                  const msg = (notif.message || '').toLowerCase();
                  const type = (notif.type || '').toLowerCase();
                  if (type.includes('material_return') || msg.includes('return material') || msg.includes('material return')) {
                    navigation.navigate('AllottedMaterialsScreen', { mode: 'scoped', jobId: notif.job_id });
                  } else if (notif.job_id) {
                    navigation.navigate('UpdateWork', { jobId: notif.job_id });
                  } else if (type.includes('salary') || type.includes('leave') || msg.includes('salary') || msg.includes('leave')) {
                    navigation.navigate('Salary');
                  } else if (type.includes('attendance') || msg.includes('attendance')) {
                    navigation.navigate('Attendance');
                  } else {
                    navigation.navigate('Notifications');
                  }
                }}
              >
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
