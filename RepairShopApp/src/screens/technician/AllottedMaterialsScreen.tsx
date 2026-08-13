import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Modal, TextInput } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Package, ArrowRight, Info, AlertCircle, CheckCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing, typography } from '../../tokens';
import Header from '../../components/common/AppHeader';
import Button from '../../components/common/Button';
import ModalShell from '../../components/common/ModalShell';
import ErrorState from '../../components/common/ErrorState';
import { SkeletonList } from '../../components/common/SkeletonCard';
import EmptyState from '../../components/common/EmptyState';
import { mapErrorToUserMessage } from '../../utils/errorMessages';
import { formatCurrency } from '@repairshop/shared';

interface Allotment {
  id: string;
  product_id: string;
  qty: number;
  status: string;
  created_at: string;
  products?: {
    name: string;
    unit: string;
  };
}

export default function AllottedMaterialsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const jobId = route.params?.jobId;
  
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allotments, setAllotments] = useState<Allotment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAllotment, setSelectedAllotment] = useState<Allotment | null>(null);
  const [useQty, setUseQty] = useState('');
  const [isUsing, setIsUsing] = useState(false);

  const fetchAllotments = async (isRefresh = false) => {
    if (!user) return;
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('material_allotments')
        .select(`
          id,
          product_id,
          qty,
          status,
          created_at,
          products (
            name,
            unit
          )
        `)
        .eq('technician_id', user.id)
        .eq('status', 'allotted')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAllotments((data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        qty: Number(item.qty),
        status: item.status,
        created_at: item.created_at,
        products: {
          name: item.products?.name ?? '',
          unit: item.products?.unit ?? '',
        },
      })));
    } catch (err: any) {
      setError(mapErrorToUserMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllotments();
    }, [user])
  );

  const handleUseOnJob = async () => {
    if (!selectedAllotment || !jobId) return;
    const qtyToUse = parseFloat(useQty);
    if (isNaN(qtyToUse) || qtyToUse <= 0 || qtyToUse > selectedAllotment.qty) {
      alert('Invalid quantity');
      return;
    }

    try {
      setIsUsing(true);
      const { error } = await supabase.rpc('use_material_allotment', {
        p_allotment_id: selectedAllotment.id,
        p_job_id: jobId,
        p_qty: qtyToUse
      });
      if (error) throw error;
      
      setSelectedAllotment(null);
      setUseQty('');
      navigation.goBack(); // Return to job details
    } catch (err: any) {
      alert(mapErrorToUserMessage(err));
    } finally {
      setIsUsing(false);
    }
  };

  const renderItem = ({ item }: { item: Allotment }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Package size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.materialName}>{item.products?.name}</Text>
          <Text style={styles.metaText}>
            Allotted: {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText}>{item.qty} {item.products?.unit}</Text>
        </View>
      </View>
      {jobId && (
        <AppPressable 
          style={styles.useBtn} 
          onPress={() => {
            setSelectedAllotment(item);
            setUseQty(String(item.qty));
          }}
        >
          <CheckCircle size={16} color={colors.textInverse} style={{ marginRight: spacing.sm }} />
          <Text style={styles.useBtnText}>Use on Job</Text>
        </AppPressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="My Allotted Materials" showBack />
      
      <View style={styles.infoBanner}>
        <Info size={18} color={colors.primary} style={{ marginTop: 2 }} />
        <Text style={styles.infoText}>
          These are materials you have checked out but haven't consumed on jobs. 
          You can use these directly when logging materials on future jobs.
        </Text>
      </View>

      {loading && !refreshing ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchAllotments()} />
      ) : (
        <FlatList
          data={allotments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAllotments(true); }} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Package}
              heading="No Allotted Materials"
              message="You don't have any leftover materials."
            />
          }
        />
      )}

      {selectedAllotment && (
        <ModalShell visible={!!selectedAllotment} onClose={() => setSelectedAllotment(null)}>
          <View style={{ padding: spacing.md }}>
            <Text style={{ ...typography.h2, marginBottom: spacing.lg }}>Use Allotment</Text>
            <Text style={{ ...typography.body, marginBottom: spacing.md }}>
              How much of <Text style={{ fontWeight: 'bold' }}>{selectedAllotment.products?.name}</Text> do you want to use? (Max: {selectedAllotment.qty})
            </Text>
            
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={useQty} 
              onChangeText={setUseQty} 
              placeholder="Quantity"
              placeholderTextColor={colors.textMuted}
            />

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
              <Button label="Cancel" variant="secondary" onPress={() => setSelectedAllotment(null)} style={{ flex: 1 }} />
              <Button label="Confirm" onPress={handleUseOnJob} loading={isUsing} style={{ flex: 1 }} />
            </View>
          </View>
        </ModalShell>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '15',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  qtyBadge: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  qtyText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
  useBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  useBtnText: {
    color: colors.textInverse,
    ...typography.bodyBold,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    color: colors.textPrimary,
    ...typography.body,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  }
});
