import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  MapPin,
  Maximize2,
  ShieldCheck,
  Wrench,
  Headphones,
  User,
} from 'lucide-react-native';

import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { AppPressable } from '../../components/common/AppPressable';
import AppHeader from '../../components/common/AppHeader';
import EmptyState from '../../components/common/EmptyState';
import SkeletonCard from '../../components/common/SkeletonCard';
import {
  getAttendanceDateIST,
  formatTime,
  formatDate,
  getImageThumbnailUrl,
  getFullImageUrl,
} from '@repairshop/shared';

type RoleType = 'admin' | 'receptionist' | 'technician';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: RoleType;
  is_active: boolean;
}

interface StaffAttendanceItem {
  user: StaffUser;
  attendanceId?: string;
  status: 'Present' | 'Late' | 'Absent' | 'Leave';
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInSelfieId: string | null;
  checkInLat?: number | null;
  checkInLng?: number | null;
}

type TabType = 'All' | 'Present' | 'Late' | 'Absent';

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin':
      return <ShieldCheck size={16} color={colors.accentBlue} />;
    case 'technician':
      return <Wrench size={16} color={colors.accentGreen} />;
    case 'receptionist':
      return <Headphones size={16} color={colors.accentLightPurple} />;
    default:
      return <User size={16} color={colors.textSecondary} />;
  }
};

const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case 'admin':
      return { bg: colors.statusWaitingBg, fg: colors.accentBlue };
    case 'technician':
      return { bg: colors.statusCompletedBg, fg: colors.accentGreen };
    case 'receptionist':
      return { bg: colors.statusInProgressBg, fg: colors.accentLightPurple };
    default:
      return { bg: colors.backgroundAlt, fg: colors.textSecondary };
  }
};

const getStatusBadgeStyle = (status: 'Present' | 'Late' | 'Absent' | 'Leave') => {
  switch (status) {
    case 'Present':
      return {
        bg: colors.statusCompletedBg,
        fg: colors.statusCompletedFg,
        icon: <CheckCircle2 size={14} color={colors.statusCompletedFg} />,
      };
    case 'Late':
      return {
        bg: colors.statusWaitingBg,
        fg: colors.statusWaitingFg,
        icon: <Clock size={14} color={colors.statusWaitingFg} />,
      };
    case 'Absent':
      return {
        bg: colors.statusUrgentBg,
        fg: colors.statusUrgentFg,
        icon: <XCircle size={14} color={colors.statusUrgentFg} />,
      };
    case 'Leave':
      return {
        bg: colors.statusInProgressBg,
        fg: colors.statusInProgressFg,
        icon: <Clock size={14} color={colors.statusInProgressFg} />,
      };
  }
};

export default function StaffAttendanceOverviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [items, setItems] = useState<StaffAttendanceItem[]>([]);

  // Selfie preview modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImage, setModalImage] = useState<{
    url: string;
    name: string;
    time: string;
    lat?: number | null;
    lng?: number | null;
  } | null>(null);
  const [modalImageLoaded, setModalImageLoaded] = useState(false);

  const todayStr = useMemo(() => getAttendanceDateIST(), []);

  const loadData = useCallback(async () => {
    try {
      const [usersRes, attRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, email, phone, role, is_active')
          .neq('role', 'admin')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('attendance')
          .select('*')
          .eq('date', todayStr),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (attRes.error) throw attRes.error;

      const users: StaffUser[] = usersRes.data || [];
      const attendanceList = attRes.data || [];
      const attMap = new Map<string, any>();
      attendanceList.forEach((att: any) => {
        attMap.set(att.user_id, att);
      });

      const combined: StaffAttendanceItem[] = users.map(u => {
        const att = attMap.get(u.id);
        if (!att || !att.check_in_time) {
          const isLeave = att?.status === 'Leave';
          return {
            user: u,
            attendanceId: att?.id,
            status: isLeave ? 'Leave' : 'Absent',
            checkInTime: null,
            checkOutTime: null,
            checkInSelfieId: null,
          };
        }

        let isLate = false;
        if (att.check_in_time) {
          const checkInDate = new Date(att.check_in_time);
          const hours = checkInDate.getHours();
          const minutes = checkInDate.getMinutes();
          // Cut-off at 10:30 AM IST
          if (hours > 10 || (hours === 10 && minutes > 30) || att.status === 'Halfday' || att.status === 'Late') {
            isLate = true;
          }
        }

        const status: 'Present' | 'Late' | 'Absent' | 'Leave' = isLate
          ? 'Late'
          : (att.status === 'Leave' ? 'Leave' : 'Present');

        return {
          user: u,
          attendanceId: att.id,
          status,
          checkInTime: att.check_in_time,
          checkOutTime: att.check_out_time,
          checkInSelfieId: att.check_in_drive_file_id || null,
          checkInLat: att.check_in_gps_lat ?? att.gps_lat ?? null,
          checkInLng: att.check_in_gps_lng ?? att.gps_lng ?? null,
        };
      });

      setItems(combined);
    } catch (err) {
      console.error('Error loading staff attendance overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Counts
  const counts = useMemo(() => {
    let total = items.length;
    let present = 0;
    let late = 0;
    let absent = 0;

    items.forEach(item => {
      if (item.status === 'Present') present++;
      else if (item.status === 'Late') late++;
      else absent++;
    });

    return { total, present, late, absent };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    if (activeTab === 'All') return items;
    if (activeTab === 'Present') return items.filter(i => i.status === 'Present');
    if (activeTab === 'Late') return items.filter(i => i.status === 'Late');
    if (activeTab === 'Absent') return items.filter(i => i.status === 'Absent' || i.status === 'Leave');
    return items;
  }, [items, activeTab]);

  const openSelfieModal = (item: StaffAttendanceItem) => {
    if (!item.checkInSelfieId) return;
    const url = getFullImageUrl(item.checkInSelfieId);
    if (!url) return;
    setModalImageLoaded(false);
    setModalImage({
      url,
      name: item.user.name,
      time: item.checkInTime ? formatTime(item.checkInTime) : 'N/A',
      lat: item.checkInLat,
      lng: item.checkInLng,
    });
    setModalVisible(true);
  };

  const renderStaffRow = ({ item }: { item: StaffAttendanceItem }) => {
    const roleStyle = getRoleBadgeStyle(item.user.role);
    const statusStyle = getStatusBadgeStyle(item.status);
    const hasSelfie = Boolean(item.checkInSelfieId);
    const thumbnailUri = hasSelfie ? getImageThumbnailUrl(item.checkInSelfieId!, 200) : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            {getRoleIcon(item.user.role)}
            <Text style={styles.staffName} numberOfLines={1}>{item.user.name}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            {statusStyle.icon}
            <Text style={[styles.badgeText, { color: statusStyle.fg, marginLeft: 4 }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailsCol}>
            <View style={styles.metaRow}>
              <View style={[styles.roleChip, { backgroundColor: roleStyle.bg }]}>
                <Text style={[styles.roleChipText, { color: roleStyle.fg }]}>
                  {item.user.role.toUpperCase()}
                </Text>
              </View>
              {item.user.phone ? (
                <Text style={styles.phoneText}>{item.user.phone}</Text>
              ) : null}
            </View>

            <View style={styles.timeBlock}>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Check-in:</Text>
                <Text style={[styles.timeValue, !item.checkInTime && styles.timeValueDim]}>
                  {item.checkInTime ? formatTime(item.checkInTime) : 'Not Checked In'}
                </Text>
              </View>
              {item.checkInTime && (
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Check-out:</Text>
                  <Text style={[styles.timeValue, !item.checkOutTime && styles.timeValueDim]}>
                    {item.checkOutTime ? formatTime(item.checkOutTime) : 'Active / On Duty'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {hasSelfie && thumbnailUri ? (
            <AppPressable
              style={styles.selfieContainer}
              onPress={() => openSelfieModal(item)}
            >
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.selfieThumb}
                contentFit="cover"
                cachePolicy="disk"
              />
              <View style={styles.selfieOverlay}>
                <Maximize2 size={12} color={colors.textInverse} />
              </View>
            </AppPressable>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <AppHeader title="Staff Attendance" showBack={true} />

      {/* Date banner */}
      <View style={styles.dateBanner}>
        <Text style={styles.dateBannerText}>
          {formatDate(new Date().toISOString())}
        </Text>
      </View>

      {/* Summary KPI Cards */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderColor: colors.primary + '30' }]}>
          <Text style={styles.kpiLabel}>Total Staff</Text>
          <Text style={[styles.kpiValue, { color: colors.primary }]}>{counts.total}</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: colors.success + '30' }]}>
          <Text style={styles.kpiLabel}>Present</Text>
          <Text style={[styles.kpiValue, { color: colors.success }]}>{counts.present}</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: colors.accentOrange + '30' }]}>
          <Text style={styles.kpiLabel}>Late</Text>
          <Text style={[styles.kpiValue, { color: colors.accentOrange }]}>{counts.late}</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: colors.error + '30' }]}>
          <Text style={styles.kpiLabel}>Absent</Text>
          <Text style={[styles.kpiValue, { color: colors.error }]}>{counts.absent}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(['All', 'Present', 'Late', 'Absent'] as TabType[]).map(tab => {
          const isActive = activeTab === tab;
          let count = 0;
          if (tab === 'All') count = counts.total;
          else if (tab === 'Present') count = counts.present;
          else if (tab === 'Late') count = counts.late;
          else if (tab === 'Absent') count = counts.absent;

          return (
            <AppPressable
              key={tab}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
              <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            </AppPressable>
          );
        })}
      </View>

      {/* Staff List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.user.id}
          renderItem={renderStaffRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Users}
              message={`No staff ${activeTab.toLowerCase()} today`}
              subMessage="Attendance updates will appear here automatically."
            />
          }
        />
      )}

      {/* Selfie Preview Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{modalImage?.name}</Text>
                <Text style={styles.modalSubtitle}>Check-in at {modalImage?.time}</Text>
              </View>
              <AppPressable
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <X size={22} color={colors.textPrimary} />
              </AppPressable>
            </View>

            <View style={styles.modalImageWrapper}>
              {!modalImageLoaded && (
                <ActivityIndicator size="large" color={colors.primary} style={styles.modalLoader} />
              )}
              {modalImage?.url ? (
                <Image
                  source={{ uri: modalImage.url }}
                  style={styles.modalImage}
                  contentFit="contain"
                  cachePolicy="disk"
                  onLoad={() => setModalImageLoaded(true)}
                />
              ) : null}
            </View>

            {modalImage?.lat && modalImage?.lng ? (
              <View style={styles.modalFooter}>
                <MapPin size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.modalGpsText}>
                  GPS: {modalImage.lat.toFixed(6)}, {modalImage.lng.toFixed(6)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dateBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  dateBannerText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    ...shadow.card,
  },
  kpiLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  kpiValue: {
    ...typography.h2,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.textInverse,
  },
  tabBadge: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.textInverse,
  },
  loadingContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.sm,
  },
  staffName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsCol: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  roleChip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  roleChipText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  phoneText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  timeBlock: {
    gap: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 68,
  },
  timeValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timeValueDim: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  selfieContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    marginLeft: spacing.md,
  },
  selfieThumb: {
    width: '100%',
    height: '100%',
  },
  selfieOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: radius.sm,
    padding: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalImageWrapper: {
    width: '100%',
    height: 360,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalLoader: {
    position: 'absolute',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalGpsText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
