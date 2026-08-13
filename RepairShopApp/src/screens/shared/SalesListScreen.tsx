import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/common/AppHeader';
import { AppPressable } from '../../components/common/AppPressable';
import EmptyState from '../../components/common/EmptyState';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { formatDate } from '@repairshop/shared';
import { Receipt, FileText } from 'lucide-react-native';

export type UnifiedSaleItem = {
  id: string;
  source: 'Sale' | 'Job';
  code: string;
  customer_name: string;
  date: string;
  amount: number;
  status: string;
};

export default function SalesListScreen() {
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<UnifiedSaleItem[]>([]);

  const fetchSales = async () => {
    try {
      const [salesRes, jobsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('id, sale_code, customer_name, created_at, grand_total, status')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('jobs')
          .select('id, job_code, customer_name, completed_at, status, billing(grand_total)')
          .eq('status', 'Completed')
          .order('completed_at', { ascending: false })
          .limit(50)
      ]);

      const salesData = salesRes.data || [];
      const jobsData = jobsRes.data || [];

      const mappedSales: UnifiedSaleItem[] = salesData.map(s => ({
        id: s.id,
        source: 'Sale',
        code: s.sale_code,
        customer_name: s.customer_name || 'Unknown',
        date: s.created_at,
        amount: s.grand_total || 0,
        status: s.status,
      }));

      const mappedJobs: UnifiedSaleItem[] = jobsData.map(j => {
        let grandTotal = 0;
        if (Array.isArray(j.billing) && j.billing.length > 0) {
          grandTotal = (j.billing[0] as any).grand_total || 0;
        } else if (j.billing && !Array.isArray(j.billing)) {
          grandTotal = (j.billing as any).grand_total || 0;
        }

        return {
          id: j.id,
          source: 'Job',
          code: j.job_code,
          customer_name: j.customer_name || 'Unknown',
          date: j.completed_at || '',
          amount: grandTotal,
          status: j.status,
        };
      });

      const combined = [...mappedSales, ...mappedJobs].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setItems(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSales();
  }, []);

  const renderItem = useCallback(({ item }: { item: UnifiedSaleItem }) => {
    return (
      <AppPressable style={styles.card} onPress={() => {}}>
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
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </AppPressable>
    );
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title="Sales & Completed Jobs" showBack={false} />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState 
          icon={<Receipt size={48} color={colors.textMuted} />}
          heading="No Sales Found"
          subtext="Completed jobs and direct sales will appear here."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
