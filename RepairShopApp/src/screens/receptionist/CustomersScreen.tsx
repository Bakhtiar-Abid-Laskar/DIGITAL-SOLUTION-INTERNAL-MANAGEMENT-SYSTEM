import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, radius, shadow } from '../../tokens';
import { Search, User, Smartphone, Calendar, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Job } from '@repairshop/shared';
import StatusBadge from '../../components/jobs/StatusBadge';
import AppHeader from '../../components/common/AppHeader';
import { SkeletonList } from '../../components/common/SkeletonCard';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 20;

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const navigation = useNavigation<any>();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['customers', debouncedSearch],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (debouncedSearch.trim()) {
        query = query.or(`customer_name.ilike.%${debouncedSearch}%,customer_contact.ilike.%${debouncedSearch}%`);
      }
      
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Job[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    }
  });

  const jobs = data?.pages.flat() || [];

  const renderItem = ({ item }: { item: Job }) => (
    <AppPressable 
      style={styles.card}
      onPress={() => navigation.navigate('Jobs', { screen: 'JobDetail', params: { jobId: item.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <User size={18} color={colors.textSecondary} />
          <Text style={styles.customerName} numberOfLines={1}>{item.customer_name}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Smartphone size={14} color={colors.textMuted} />
          <Text style={styles.infoText}>{item.device_type}</Text>
        </View>
        <View style={styles.infoRow}>
          <Calendar size={14} color={colors.textMuted} />
          <Text style={styles.infoText}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.jobCode}>{item.job_code}</Text>
        <ChevronRight size={18} color={colors.border} />
      </View>
    </AppPressable>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Customers" showBack={true} />
      
      <View style={styles.searchContainer}>
        <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {isLoading ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={11}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 120, 
            offset: 120 * index,
            index,
          })}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="small" color={colors.primary} style={{ margin: spacing.md }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <User size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>No customers found</Text>
              <Text style={styles.emptySubtext}>
                {debouncedSearch ? "Try a different search term" : "Recent customers will appear here"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    ...typography.body,
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  customerName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  cardBody: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  jobCode: {
    ...typography.label,
    color: colors.textMuted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
