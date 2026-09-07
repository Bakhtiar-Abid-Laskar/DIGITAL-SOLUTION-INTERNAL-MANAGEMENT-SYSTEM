import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Platform, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/common/AppHeader';
import { AppPressable } from '../../components/common/AppPressable';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonList } from '../../components/common/SkeletonCard';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { formatDate, useDebounceValue } from '@repairshop/shared';
import { Receipt, FileText, Search } from 'lucide-react-native';
import StatusBadge from '../../components/jobs/StatusBadge';

export type UnifiedSaleItem = {
  id: string;
  source: 'Sale' | 'Job';
  code: string;
  customer_name: string;
  date: string;
  amount: number;
  status: string;
};

interface SaleListItemProps {
  item: UnifiedSaleItem;
  onPress: (id: string) => void;
}

const SaleListItem = React.memo(function SaleListItem({ item, onPress }: SaleListItemProps) {
  return (
    <AppPressable style={styles.card} onPress={() => onPress(item.id)}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          {item.source === 'Sale' ? (
            <Receipt size={16} color={colors.primary} />
          ) : (
            <FileText size={16} color={colors.accentBlue} />
          )}
          <Text style={styles.codeText}>{item.code}</Text>
        </View>
        <Text style={styles.amountText}>₹{Number(item.amount).toFixed(2)}</Text>
      </View>

      <View style={styles.cardBody}>
        <View>
          <Text style={styles.customerText} numberOfLines={1}>{item.customer_name}</Text>
          <Text style={styles.dateText}>{item.date ? formatDate(item.date) : 'Unknown Date'}</Text>
        </View>
        <StatusBadge status={item.status === 'paid' ? 'Completed' : (item.status === 'cancelled' ? 'Urgent' : 'Waiting')} />
      </View>
    </AppPressable>
  );
});

export default function SalesListScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

  // TanStack Query with caching for Sales List
  const {
    data: items = [],
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
  } = useQuery<UnifiedSaleItem[]>({
    queryKey: ['mobile-sales', debouncedSearchQuery],
    queryFn: async () => {
      let matchedSaleIds: string[] = [];
      if (debouncedSearchQuery) {
        const queryStr = `%${debouncedSearchQuery}%`;
        const { data: itemMatches } = await supabase
          .from('invoice_items')
          .select('invoice_id')
          .or(`serial_number.ilike.${queryStr},item_name.ilike.${queryStr}`);
        if (itemMatches && itemMatches.length > 0) {
          matchedSaleIds = itemMatches.map(i => i.invoice_id).filter(Boolean);
        }
      }

      let query = supabase
        .from('invoices')
        .select('id, invoice_code, customer_name, created_at, grand_total, status, job_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (debouncedSearchQuery) {
        const queryStr = `%${debouncedSearchQuery}%`;
        let orString = `invoice_code.ilike.${queryStr},customer_name.ilike.${queryStr},customer_contact.ilike.${queryStr}`;
        if (matchedSaleIds.length > 0) {
          orString += `,id.in.(${matchedSaleIds.join(',')})`;
        }
        query = query.or(orString);
      }

      const { data: invoicesData, error } = await query;
      if (error) throw error;

      return (invoicesData || []).map((inv: any) => ({
        id: inv.id,
        source: inv.job_id ? 'Job' : 'Sale',
        code: inv.invoice_code || '—',
        customer_name: inv.customer_name || 'Unknown',
        date: inv.created_at,
        amount: Number(inv.grand_total) || 0,
        status: inv.status,
      }));
    },
    staleTime: 60 * 1000,
  });

  // Real-time invalidation on invoice changes
  useEffect(() => {
    const channel = supabase
      .channel('mobile-sales-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        queryClient.invalidateQueries({ queryKey: ['mobile-sales'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleOpenDetail = useCallback((id: string) => {
    navigation.navigate('SaleDetail', { invoiceId: id });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: UnifiedSaleItem }) => {
    return <SaleListItem item={item} onPress={handleOpenDetail} />;
  }, [handleOpenDetail]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 96,
    offset: (96 + spacing.md) * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <AppHeader title="Sales" showBack={true} />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by code, customer, product, serial no..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      
      {loading && !refreshing ? (
        <SkeletonList count={5} />
      ) : items.length === 0 ? (
        <EmptyState 
          icon={<Receipt size={48} color={colors.textMuted} />}
          message="No Sales Found"
          subMessage="Completed jobs and direct sales will appear here."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          getItemLayout={getItemLayout}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  codeText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  amountText: {
    ...typography.h3,
    color: colors.success,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  customerText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    maxWidth: 200,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    ...typography.caption,
    color: colors.textPrimary,
  }
});
