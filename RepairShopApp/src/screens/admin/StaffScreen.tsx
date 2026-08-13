import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl,  } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { User, ShieldCheck, Wrench, Headphones, MoreVertical, Plus } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/common/AppHeader';
import EmptyState from '../../components/common/EmptyState';
import SkeletonCard from '../../components/common/SkeletonCard';
import BottomSheet from '../../components/common/BottomSheet';
import Button from '../../components/common/Button';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { useToast } from '../../context/ToastContext';

type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'receptionist' | 'technician';
  is_active: boolean;
};

type AttendanceRecord = {
  id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin': return <ShieldCheck size={20} color={colors.accentBlue} />;
    case 'technician': return <Wrench size={20} color={colors.accentGreen} />;
    case 'receptionist': return <Headphones size={20} color={colors.accentLightPurple} />;
    default: return <User size={20} color={colors.textSecondary} />;
  }
};

const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case 'admin': return { bg: colors.statusWaitingBg, fg: colors.accentBlue };
    case 'technician': return { bg: colors.statusCompletedBg, fg: colors.accentGreen };
    case 'receptionist': return { bg: colors.statusInProgressBg, fg: colors.accentLightPurple };
    default: return { bg: colors.backgroundAlt, fg: colors.textSecondary };
  }
};

const formatTime = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getStatusColor = (status: string) => {
  if (status === 'Present') return colors.accentGreen;
  if (status === 'Half-day') return colors.accentOrange;
  return colors.accentRed;
};

const StaffRow = React.memo(function StaffRow({ item, openOptions }: { item: UserData; openOptions: (u: UserData) => void }) {
  const roleStyle = getRoleBadgeStyle(item.role);
  const badgeStyle = useMemo(() => [styles.roleBadge, { backgroundColor: roleStyle.bg }], [roleStyle.bg]);
  const textStyle = useMemo(() => [styles.roleBadgeText, { color: roleStyle.fg }], [roleStyle.fg]);
  const inactiveBadgeStyle = useMemo(() => [styles.roleBadge, { backgroundColor: colors.statusUrgentBg }], []);
  const inactiveTextStyle = useMemo(() => [styles.roleBadgeText, { color: colors.statusUrgentFg }], []);

  const handleOptions = useCallback(() => openOptions(item), [item, openOptions]);

  return (
    <View style={[styles.card, !item.is_active && styles.cardInactive]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {getRoleIcon(item.role)}
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        </View>
        <AppPressable onPress={handleOptions} style={styles.optionsBtn}>
          <MoreVertical size={20} color={colors.textSecondary} />
        </AppPressable>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoCol}>
          <Text style={styles.infoText}>{item.email}</Text>
          {item.phone && <Text style={styles.infoText}>{item.phone}</Text>}
        </View>
        <View style={styles.badgesCol}>
          <View style={badgeStyle}>
            <Text style={textStyle}>
              {item.role.toUpperCase()}
            </Text>
          </View>
          {!item.is_active && (
            <View style={inactiveBadgeStyle}>
              <Text style={inactiveTextStyle}>INACTIVE</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const AttendanceRow = React.memo(function AttendanceRow({ item }: { item: AttendanceRecord }) {
  const dotStyle = useMemo(() => [styles.statusDot, { backgroundColor: getStatusColor(item.status) }], [item.status]);
  return (
    <View style={styles.attendanceRow}>
      <View style={styles.attendanceDateCol}>
        <Text style={styles.attendanceDate}>{item.date}</Text>
      </View>
      <View style={styles.attendanceTimesCol}>
        <Text style={styles.attendanceTime}>In: {formatTime(item.check_in_time)}</Text>
        <Text style={styles.attendanceTime}>Out: {formatTime(item.check_out_time)}</Text>
      </View>
      <View style={dotStyle} />
    </View>
  );
});

export default function StaffScreen() {
  const bottomPadding = useBottomInsetPadding('nav');
  const { showToast } = useToast();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const [users, setUsers] = useState<UserData[]>([]);

  const [optionsVisible, setOptionsVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [toggling, setToggling] = useState(false);

  // Attendance modal
  const [attendanceVisible, setAttendanceVisible] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const openOptions = useCallback((u: UserData) => {
    setSelectedUser(u);
    setOptionsVisible(true);
  }, []);

  const renderStaffItem = useCallback(({ item }: { item: UserData }) => (
    <StaffRow item={item} openOptions={openOptions} />
  ), [openOptions]);

  const renderAttendanceItem = useCallback(({ item }: { item: AttendanceRecord }) => (
    <AttendanceRow item={item} />
  ), []);

  const fetchUsers = async (pageNum = 0, replace = true, cancelled = false) => {
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true })
        .range(from, to);

      if (cancelled) return;
      if (error) throw error;
      
      if (replace) {
        setUsers(data || []);
      } else {
        setUsers(prev => [...prev, ...(data || [])]);
      }
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      if (cancelled) return;
      console.error('Error fetching users:', err);
    } finally {
      if (!cancelled) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setPage(0);
      fetchUsers(0, true, cancelled);
      return () => { cancelled = true; };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchUsers(0, true);
  };

  const onLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchUsers(nextPage, false);
  };



  const toggleStatus = async () => {
    if (!selectedUser) return;
    setToggling(true);
    try {
      const newStatus = !selectedUser.is_active;
      const { error } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', selectedUser.id);

      if (error) throw error;

      showToast({ title: 'Success', message: `User ${newStatus ? 'activated' : 'deactivated'} successfully.`, type: 'success' });
      setOptionsVisible(false);
      fetchUsers();
    } catch (err: any) {
      showToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setToggling(false);
    }
  };

  const viewAttendance = async () => {
    if (!selectedUser) return;
    setOptionsVisible(false);
    setAttendanceLoading(true);
    setAttendanceVisible(true);

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance')
        .select('id, date, check_in_time, check_out_time, status')
        .eq('user_id', selectedUser.id)
        .gte('date', fromDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };



  return (
    <View style={styles.container}>
      <AppHeader
        title="Staff Management"
        showBack={false}
        rightIcon={<Plus size={20} color={colors.accentBlue} strokeWidth={2.5} />}
        onRightPress={() => navigation.navigate('AdminCreateStaff')}
      />

      {loading && !refreshing ? (
        <View style={styles.listContent}>
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<User size={44} color={colors.textMuted} strokeWidth={1.5} />}
              heading="No staff found"
              subtext="Tap + to add a new staff member."
            />
          }
          renderItem={renderStaffItem}
        />
      )}

      {/* Staff Options Sheet */}
      <BottomSheet visible={optionsVisible} onClose={() => setOptionsVisible(false)}>
        {selectedUser && (
          <>
            <Text style={{ ...typography.h2, marginBottom: spacing.xs }}>{selectedUser.name}</Text>
            <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}>
              {selectedUser.email}
            </Text>

            <View style={{ gap: spacing.md }}>
              <Button
                label="View Attendance"
                variant="secondary"
                onPress={viewAttendance}
              />
              <Button
                label={selectedUser.is_active ? 'Deactivate User' : 'Activate User'}
                onPress={toggleStatus}
                loading={toggling}
                variant={selectedUser.is_active ? 'secondary' : 'primary'}
                style={selectedUser.is_active ? { borderColor: colors.accentRed } : { backgroundColor: colors.success }}
              />
              <Button label="Cancel" variant="secondary" onPress={() => setOptionsVisible(false)} />
            </View>
          </>
        )}
      </BottomSheet>

      {/* Attendance Modal */}
      <BottomSheet visible={attendanceVisible} onClose={() => setAttendanceVisible(false)}>
        <Text style={{ ...typography.h2, marginBottom: spacing.xs }}>
          {selectedUser?.name} — Attendance
        </Text>
        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg }}>
          Last 30 days
        </Text>

        {attendanceLoading ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text style={{ ...typography.body, color: colors.textSecondary }}>Loading…</Text>
          </View>
        ) : attendanceRecords.length === 0 ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text style={{ ...typography.body, color: colors.textMuted }}>No attendance records in the last 30 days.</Text>
          </View>
        ) : (
          <View style={{ maxHeight: 420 }}>
            <FlatList
              data={attendanceRecords}
              keyExtractor={r => r.id}
              renderItem={renderAttendanceItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  listContent: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardInactive: {
    opacity: 0.6,
    backgroundColor: colors.backgroundAlt,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  optionsBtn: {
    padding: spacing.xs,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  attendanceDateCol: {
    flex: 1,
  },
  attendanceDate: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  attendanceTimesCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  attendanceTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
});
