import { AppPressable } from '../../components/common/AppPressable';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Bell, Mail, MessageCircle, BellDot } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/common/AppHeader';
import EmptyState from '../../components/common/EmptyState';
import SkeletonCard from '../../components/common/SkeletonCard';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';

type Notification = {
  id: string;
  job_id: string | null;
  channel: 'push' | 'whatsapp' | 'email';
  message: string;
  sent_at: string;
  status: 'pending' | 'sent' | 'failed';
  is_read: boolean;
  type?: string;
};

type TabValue = 'All' | 'Unread' | 'Important';

const PAGE_SIZE = 20;

const getIconData = (channel: string) => {
  switch (channel) {
    case 'whatsapp':
      return { icon: <MessageCircle size={24} color={colors.accentGreen} />, bg: colors.statusCompletedBg };
    case 'email':
      return { icon: <Mail size={24} color={colors.accentBlue} />, bg: colors.statusWaitingBg };
    case 'push':
    default:
      return { icon: <Bell size={24} color={colors.accentLightPurple} />, bg: colors.statusInProgressBg };
  }
};

const formatRelativeTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const NotificationRow = React.memo(({ item, onPress }: { item: Notification, onPress: (item: Notification) => void }) => {
  const { icon, bg } = getIconData(item.channel);
  const isRead = item.is_read;
  
  return (
    <AppPressable
      style={[styles.rowCard, isRead && styles.rowCardRead]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIconBox, { backgroundColor: bg }]}>
        {icon}
      </View>
      
      <View style={styles.rowDetails}>
        <Text style={[styles.message, isRead && styles.messageRead]} numberOfLines={2}>
          {item.message}
        </Text>
      </View>

      <View style={styles.rowTrailing}>
        <Text style={styles.timeText}>{formatRelativeTime(item.sent_at)}</Text>
        {!isRead && <View style={styles.unreadDot} />}
      </View>
    </AppPressable>
  );
});

export default function NotificationsScreen() {
  const { user, role } = useAuth();
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomInsetPadding('nav');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>('All');
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const fetchingRef = useRef(false);

  const [counts, setCounts] = useState<Record<string, number>>({
    All: 0,
    Unread: 0,
    Important: 0});

  const fetchTabCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [allRes, unreadRes, impRes1, impRes2] = await Promise.all([
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_user_id', user.id),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_user_id', user.id).eq('is_read', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_user_id', user.id).eq('status', 'failed'),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_user_id', user.id).eq('type', 'urgent')
      ]);

      setCounts({
        All: allRes.count ?? 0,
        Unread: unreadRes.count ?? 0,
        Important: (impRes1.count ?? 0) + (impRes2.count ?? 0)});
    } catch (err) {
      console.error('Error fetching notification tab counts:', err);
    }
  }, [user]);

  const fetchNotifications = useCallback(async (pageNum: number, replace: boolean) => {
    if (!user || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('sent_at', { ascending: false });

      if (activeTab === 'Unread') {
        query = query.eq('is_read', false);
      } else if (activeTab === 'Important') {
        query = query.or('status.eq.failed,type.eq.urgent');
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      if (replace) {
        setNotifications(data || []);
      } else {
        setNotifications(prev => [...prev, ...(data || [])]);
      }
      
      setHasMore((data || []).length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user, activeTab]);

  useFocusEffect(
    useCallback(() => {
      setPage(0);
      setLoading(true);
      fetchTabCounts();
      fetchNotifications(0, true);
      
      const channel = supabase
        .channel('notifications_screen')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `recipient_user_id=eq.${user?.id}` },
          () => {
            fetchTabCounts();
            fetchNotifications(0, true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [user?.id, activeTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchTabCounts();
    fetchNotifications(0, true);
  };

  const onLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchNotifications(nextPage, false);
  };

  const markAllRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_user_id', user.id)
      .eq('is_read', false);
    fetchTabCounts();
  };

  const handleNotificationPress = useCallback(async (item: Notification) => {
    if (!item.is_read) {
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', item.id);
      fetchTabCounts();
    }

    if (item.job_id) {
      if (role === 'admin') {
        navigation.navigate('AdminRoot', { screen: 'AdminJobDetail', params: { jobId: item.job_id } });
      } else if (role === 'receptionist') {
        navigation.navigate('ReceptionistRoot', { screen: 'JobDetail', params: { jobId: item.job_id } });
      } else if (role === 'technician') {
        navigation.navigate('TechnicianRoot', { screen: 'UpdateWork', params: { jobId: item.job_id } });
      }
    }
  }, [fetchTabCounts, role, navigation]);

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
  };

  const renderNotificationItem = useCallback(({ item }: { item: Notification }) => (
    <NotificationRow item={item} onPress={handleNotificationPress} />
  ), [handleNotificationPress]);

  return (
    <View style={styles.container}>
      <AppHeader title="Notifications" showBack={true} />

      <View style={styles.headerArea}>
        <View style={styles.tabsContainer}>
          {(['All', 'Unread', 'Important'] as TabValue[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <AppPressable
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabChange(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab} ({counts[tab] || 0})
                </Text>
              </AppPressable>
            );
          })}
        </View>

        {counts.Unread > 0 && activeTab !== 'Important' && (
          <AppPressable style={styles.markReadBtn} onPress={markAllRead}>
            <BellDot size={16} color={colors.primary} />
            <Text style={styles.markReadText}>Mark all as read</Text>
          </AppPressable>
        )}
      </View>

      {loading ? (
        <View style={styles.listContent}>
          {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + spacing.xl }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ margin: spacing.md }} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={48} color={colors.textMuted} />}
              heading={activeTab === 'All' ? 'No notifications yet' : `No ${activeTab.toLowerCase()} notifications`}
              subtext="You're all caught up!"
            />
          }
          renderItem={renderNotificationItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background},
  headerArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border},
  tabsContainer: {
    flexDirection: 'row',
    gap: spacing.sm},
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border},
  tabActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary},
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600'},
  tabTextActive: {
    color: colors.background},
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs},
  markReadText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600'},
  listContent: {
    padding: spacing.lg},
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border},
  rowCardRead: {
    backgroundColor: colors.backgroundAlt,
    opacity: 0.8},
  rowIconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md},
  rowDetails: {
    flex: 1,
    marginRight: spacing.sm},
  message: {
    ...typography.bodyBold,
    color: colors.textPrimary},
  messageRead: {
    ...typography.body,
    color: colors.textSecondary},
  rowTrailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xs,
    width: 50},
  timeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10},
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed}});
