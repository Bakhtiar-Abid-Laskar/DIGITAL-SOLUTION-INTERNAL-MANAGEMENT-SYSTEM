import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, RefreshControl, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Search, Package } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/common/AppHeader';
import { SkeletonList } from '../../components/common/SkeletonCard';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import AllottedMaterialsCard, { AllottedMaterialRecord } from '../../components/materials/AllottedMaterialsCard';
import { colors, radius, spacing, typography } from '../../tokens';
import { useToast } from '../../context/ToastContext';

interface AllottedMaterialsScreenProps {
  mode?: 'all' | 'scoped';
}

export default function AllottedMaterialsScreen({ mode: propMode }: AllottedMaterialsScreenProps) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const mode = propMode || route.params?.mode || (role === 'technician' ? 'scoped' : 'all');
  const isScoped = mode === 'scoped';
  const canManage = role === 'admin' || role === 'receptionist';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allotments, setAllotments] = useState<AllottedMaterialRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [returningId, setReturningId] = useState<string | null>(null);

  const fetchAllotments = useCallback(async (isRefresh = false) => {
    if (!user) return;
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      let query = supabase
        .from('material_allotments')
        .select(`
          id,
          job_id,
          inventory_id,
          product_id,
          technician_id,
          allotted_by,
          quantity,
          status,
          allotted_at,
          returned_at,
          returned_by,
          notes,
          technician:users!material_allotments_technician_id_fkey ( id, name ),
          allotted_by_user:users!material_allotments_allotted_by_fkey ( id, name ),
          inventory:inventory ( id, item_name, unit, cost_price ),
          jobs:jobs ( id, job_code, customer_name, technician:users!jobs_technician_id_fkey(name) )
        `)
        .eq('status', 'allotted')
        .order('allotted_at', { ascending: false });

      if (isScoped && user?.id) {
        query = query.eq('technician_id', user.id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const formatted: AllottedMaterialRecord[] = (data || []).map((row: any) => {
        const itemName = row.inventory?.item_name || row.notes || 'Unknown Material';
        const techName = isScoped
          ? 'You'
          : (row.technician?.name || row.jobs?.technician?.name || row.allotted_by_user?.name || 'Unassigned');

        return {
          id: row.id,
          material_name: itemName,
          quantity: Number(row.quantity ?? 0),
          unit_cost: Number(row.inventory?.cost_price ?? 0),
          created_at: row.allotted_at ?? new Date().toISOString(),
          technician_id: row.technician_id,
          technician_name: techName,
          job_id: row.job_id,
          job_code: row.jobs?.job_code,
          customer_name: row.jobs?.customer_name,
          source: 'allotments' as const,
        };
      });

      setAllotments(formatted);
    } catch (err: any) {
      console.error('Error fetching allotments:', err.message);
      setError(err.message || 'Failed to load allotted materials.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isScoped]);

  useFocusEffect(
    useCallback(() => {
      fetchAllotments();

      const channel = supabase
        .channel('mobile_allotted_materials_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'material_allotments' },
          () => {
            fetchAllotments(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [fetchAllotments])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllotments(true);
  };

  const handleMarkReturned = useCallback(async (allotmentId: string) => {
    Alert.alert(
      'Mark as Returned',
      'This will restore the material quantity back to central inventory. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Returned',
          style: 'default',
          onPress: async () => {
            try {
              setReturningId(allotmentId);
              const { data, error } = await supabase.rpc('return_allocated_material', {
                p_allotment_id: allotmentId,
                p_user_id: user?.id || null,
              });
              if (error) throw error;
              showToast({ title: 'Success', message: 'Material returned to central stock.', type: 'success' });
              fetchAllotments(true);
            } catch (err: any) {
              showToast({ title: 'Error', message: err.message || 'Failed to return material.', type: 'error' });
            } finally {
              setReturningId(null);
            }
          },
        },
      ]
    );
  }, [fetchAllotments, user?.id, showToast]);

  const handleNotify = useCallback(async (allotmentId: string) => {
    try {
      const { data, error } = await supabase.rpc('notify_technician_allocated_material', {
        p_allotment_id: allotmentId,
      });
      if (error) throw error;
      showToast({ title: 'Notified', message: 'Technician has been sent a reminder.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', message: err.message || 'Failed to send notification.', type: 'error' });
    }
  }, [showToast]);

  const filteredAllotments = useMemo(() => {
    if (!searchQuery.trim()) return allotments;
    const q = searchQuery.toLowerCase().trim();
    return allotments.filter((item) =>
      item.material_name.toLowerCase().includes(q) ||
      (item.technician_name && item.technician_name.toLowerCase().includes(q)) ||
      (item.job_code && item.job_code.toLowerCase().includes(q)) ||
      (item.customer_name && item.customer_name.toLowerCase().includes(q))
    );
  }, [allotments, searchQuery]);

  const totalHeldUnits = useMemo(() => {
    return allotments.reduce((sum, item) => sum + item.quantity, 0);
  }, [allotments]);

  return (
    <View style={styles.container}>
      <AppHeader
        title={isScoped ? 'My Allocated Items' : 'Allocated Materials'}
        showBack={true}
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={isScoped ? 'Search your held materials...' : 'Search by material, technician, or job...'}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* List Content */}
        {loading ? (
          <SkeletonList count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchAllotments()} />
        ) : (
          <FlatList
            data={filteredAllotments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
            renderItem={({ item }) => (
              <AllottedMaterialsCard
                item={item}
                showTechnician={!isScoped}
                showActions={canManage}
                onMarkReturned={handleMarkReturned}
                onNotify={handleNotify}
                returning={returningId === item.id}
                onPressJob={(jobId) => {
                  if (role === 'admin') {
                    navigation.navigate('AdminJobDetail', { jobId });
                  } else if (role === 'receptionist') {
                    navigation.navigate('JobDetail', { jobId });
                  } else {
                    navigation.navigate('UpdateWork', { jobId });
                  }
                }}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                icon={Package}
                message={
                  searchQuery.trim()
                    ? 'No matching materials found'
                    : isScoped
                    ? 'No leftover items held'
                    : 'No allocated materials in field'
                }
                subMessage={
                  isScoped
                    ? 'Any unused materials from completed jobs will appear here until returned.'
                    : 'All technician allocations are reconciled and returned to stock.'
                }
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: colors.textPrimary,
    ...typography.body,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
});
