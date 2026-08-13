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

  const fetchAllotments = async (isRefresh = false) => {
    if (!user) return;
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      let query = supabase
        .from('material_allotments')
        .select(`
          id,
          technician_id,
          qty,
          status,
          created_at,
          products ( id, name, unit ),
          source_job_material:source_job_material_id (
            id,
            job_id,
            jobs ( job_code, customer_name )
          )
        `)
        .eq('status', 'allotted')
        .order('created_at', { ascending: false });

      if (isScoped) {
        query = query.eq('technician_id', user.id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // For non-scoped (admin/receptionist) we also fetch technician names separately
      let techMap: Record<string, string> = {};
      if (!isScoped && data && data.length > 0) {
        const techIds = [...new Set((data as any[]).map((r: any) => r.technician_id).filter(Boolean))];
        if (techIds.length > 0) {
          const { data: techData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', techIds);
          (techData || []).forEach((t: any) => { techMap[t.id] = t.name; });
        }
      }

      const formatted: AllottedMaterialRecord[] = (data || []).map((row: any) => ({
        id: row.id,
        material_name: row.products?.name ?? 'Unknown Material',
        quantity: Number(row.qty ?? 0),
        unit_cost: 0,
        created_at: row.created_at ?? new Date().toISOString(),
        technician_id: row.technician_id,
        technician_name: isScoped ? 'You' : (techMap[row.technician_id] ?? 'Unassigned'),
        job_id: row.source_job_material?.job_id,
        job_code: row.source_job_material?.jobs?.job_code,
        customer_name: row.source_job_material?.jobs?.customer_name,
        source: 'allotments' as const,
      }));

      setAllotments(formatted);
    } catch (err: any) {
      console.error('Error fetching allotments:', err.message);
      setError(err.message || 'Failed to load allotted materials.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllotments();
    }, [user?.id, mode])
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
              const { error } = await supabase.rpc('return_material_allotment', {
                p_allotment_id: allotmentId,
              });
              if (error) throw error;
              showToast({ title: 'Success', message: 'Material returned to inventory.', type: 'success' });
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
  }, [fetchAllotments]);

  const handleNotify = useCallback(async (technicianId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          technician_id: technicianId,
          title: 'Return Materials Required',
          body: 'Please return your leftover allotted materials to the store.',
          data: { type: 'return_materials' },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success === false) throw new Error(data.message || 'Notification failed.');

      showToast({ title: 'Notified', message: 'Technician has been notified.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', message: err.message || 'Failed to send notification.', type: 'error' });
    }
  }, []);

  const handlePressJob = useCallback((jobId: string) => {
    if (role === 'technician') {
      navigation.navigate('UpdateWork', { jobId });
    } else {
      navigation.navigate('JobDetail', { jobId });
    }
  }, [role, navigation]);

  const filteredAllotments = useMemo(() => {
    if (!searchQuery.trim()) return allotments;
    const term = searchQuery.toLowerCase().trim();
    return allotments.filter(
      (m) =>
        m.material_name.toLowerCase().includes(term) ||
        (m.technician_name && m.technician_name.toLowerCase().includes(term)) ||
        (m.job_code && m.job_code.toLowerCase().includes(term)) ||
        (m.customer_name && m.customer_name.toLowerCase().includes(term))
    );
  }, [allotments, searchQuery]);

  const renderAllotmentItem = useCallback(({ item }: { item: any }) => (
    <AllottedMaterialsCard
      item={item}
      onPressJob={handlePressJob}
      showTechnician={!isScoped}
      showActions={canManage}
      onMarkReturned={canManage ? handleMarkReturned : undefined}
      onNotify={canManage ? handleNotify : undefined}
      returning={returningId === item.id}
    />
  ), [handlePressJob, isScoped, canManage, handleMarkReturned, handleNotify, returningId]);

  return (
    <View style={styles.container}>
      <AppHeader
        title={isScoped ? 'My Allotted Materials' : 'Allotted Materials'}
        showBack={true}
      />

      <View style={styles.content}>
        {/* Info Banner for managers */}
        {canManage && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              These are materials checked out by technicians that have leftover from completed jobs.
              Use "Remind" to notify the technician or "Mark Returned" to restore stock.
            </Text>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={isScoped ? 'Search material or job...' : 'Search material, technician, or job...'}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Count badge */}
        {!loading && !error && (
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {filteredAllotments.length} active allotment{filteredAllotments.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Main List */}
        {loading && !refreshing ? (
          <SkeletonList count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchAllotments()} />
        ) : filteredAllotments.length === 0 ? (
          <EmptyState
            heading={searchQuery ? 'No matches found' : 'No active allotments'}
            message={
              searchQuery
                ? 'Try a different search term.'
                : isScoped
                ? 'You have no leftover materials currently.'
                : 'All materials have been used or returned.'
            }
            icon={Package}
          />
        ) : (
          <FlatList
            data={filteredAllotments}
            keyExtractor={(item) => item.id}
            renderItem={renderAllotmentItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
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
    paddingTop: spacing.sm,
  },
  infoBanner: {
    backgroundColor: colors.primary + '12',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  countRow: {
    marginBottom: spacing.sm,
  },
  countText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  listContainer: {
    paddingBottom: spacing.xxl,
  },
});
