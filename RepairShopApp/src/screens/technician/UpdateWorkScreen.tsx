import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Job, JobMaterial, JobStatus } from '../../types/job';
import JobDetailShell from '../../components/jobs/JobDetailShell';
import { SkeletonList } from '../../components/common/SkeletonCard';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import SectionLabel from '../../components/common/SectionLabel';
import Button from '../../components/common/Button';
import AddMaterialModal from '../../components/materials/AddMaterialModal';
import MaterialList from '../../components/materials/MaterialList';
import BottomSheet from '../../components/common/BottomSheet';
import StatusBadge from '../../components/jobs/StatusBadge';
import { CompletionSelfieBanner } from '../../components/work/CompletionSelfieBanner';
import { MaterialUsageModal } from '../../components/work/MaterialUsageModal';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '@repairshop/shared';
import { Plus, ChevronDown, Package } from 'lucide-react-native';
import { mapErrorToUserMessage } from '../../utils/errorMessages';

const ALL_STATUS_OPTIONS: JobStatus[] = ['In Progress', 'Waiting for Materials', 'Completed'];

export default function UpdateWorkScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const jobId = route.params?.jobId;
  const completionSelfieRequired: boolean = route.params?.completionSelfieRequired ?? false;
  const { showToast } = useToast();

  const [state, setState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      loading: true,
      error: null as string | null,
      job: null as Job | null,
      materials: [] as JobMaterial[],
      notes: '',
      notesFocused: false,
      showMaterialModal: false,
      updating: false,
      statusSelectorVisible: false,
      selectedStatus: 'In Progress' as JobStatus,
      deleteConfirmVisible: false,
      materialToDelete: null as string | null,
      confirmingMaterialsVisible: false,
      usageQuantities: {} as Record<string, string>,
    }
  );

  const { loading, error, job, materials, notes, notesFocused, showMaterialModal, updating, statusSelectorVisible, selectedStatus, deleteConfirmVisible, materialToDelete, confirmingMaterialsVisible, usageQuantities } = state;

  const fetchJobData = async () => {
    if (!user) return;
    try {
      setState({ loading: true, error: null });
      const { data: jobData, error: jobError } = await supabase
        .from('jobs').select('*').eq('id', jobId).eq('technician_id', user.id).single();
      if (jobError || !jobData) throw new Error('Job not found or not assigned to you.');
      setState({ job: jobData, notes: jobData.work_notes || '', selectedStatus: jobData.status });
      const { data: matsData } = await supabase.from('job_materials').select('*').eq('job_id', jobId);
      if (matsData) setState({ materials: matsData });
    } catch (err: any) {
      setState({ error: mapErrorToUserMessage(err) });
    } finally {
      setState({ loading: false });
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobData();
      const channel = supabase.channel(`update-work-${jobId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` }, fetchJobData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'job_materials', filter: `job_id=eq.${jobId}` }, fetchJobData)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }, [jobId])
  );

  const totalCost = useMemo(() =>
    materials.reduce((sum: number, mat: any) => sum + (mat.total_cost || (mat.quantity * mat.unit_cost)), 0),
  [materials]);

  const confirmDeleteMaterial = (matId: string) => {
    setState({ materialToDelete: matId, deleteConfirmVisible: true });
  };

  const deleteMaterial = async () => {
    if (!materialToDelete) return;
    setState({ deleteConfirmVisible: false });
    try {
      const { error } = await supabase.from('job_materials').delete().eq('id', materialToDelete);
      if (error) throw error;
      await fetchJobData();
    } catch (err: any) {
      showToast({ title: 'Error', message: mapErrorToUserMessage(err), type: 'error' });
    }
  };

  const finalizeUpdate = async () => {
    if (!job) return;
    try {
      setState({ updating: true });
      const unconfirmed = materials.filter((m: any) => m.checkout_status === 'checked_out');

      if (selectedStatus === 'Completed' && unconfirmed.length > 0) {
        const materialPayload = unconfirmed.map((mat: any) => {
          const usedQty = parseFloat(usageQuantities[mat.id] ?? String(mat.added_qty ?? mat.qty_taken ?? mat.quantity));
          const maxAllowed = Number(mat.added_qty ?? mat.qty_taken ?? mat.quantity);
          if (isNaN(usedQty) || usedQty < 0 || usedQty > maxAllowed) {
            throw new Error(`Invalid quantity for ${mat.material_name}. Must be between 0 and ${maxAllowed}.`);
          }
          return {
            material_id: mat.id,
            used_qty: usedQty,
          };
        });

        // Call atomic completion RPC
        const { error: rpcError } = await supabase.rpc('complete_job_materials', {
          p_job_id: jobId,
          p_materials: materialPayload,
          p_work_notes: notes.trim() || null,
          p_technician_id: user!.id,
        });

        if (rpcError) throw rpcError;
      } else {
        const updates: any = { work_notes: notes, status: selectedStatus };
        if (selectedStatus === 'Completed') {
          updates.completed_at = new Date().toISOString();
        }
        const { error } = await supabase.from('jobs').update(updates).eq('id', jobId).eq('technician_id', user!.id);
        if (error) throw error;
      }

      setState({ confirmingMaterialsVisible: false });
      showToast({ title: 'Success', message: 'Job updated successfully.', type: 'success' });
      await fetchJobData();
    } catch (err: any) {
      showToast({ title: 'Update Failed', message: mapErrorToUserMessage(err), type: 'error' });
    } finally {
      setState({ updating: false });
    }
  };

  const handleUpdate = async () => {
    if (!job) return;
    setState({ statusSelectorVisible: false });
    if (selectedStatus === 'Completed' && job.status !== 'Completed') {
      const unconfirmed = materials.filter((m: any) => m.checkout_status === 'checked_out');
      if (unconfirmed.length > 0) {
        const initialQs: Record<string, string> = {};
        unconfirmed.forEach((m: any) => { initialQs[m.id] = String(m.qty_taken || m.quantity); });
        setState({ usageQuantities: initialQs, confirmingMaterialsVisible: true });
        return;
      }
    }
    await finalizeUpdate();
  };

  if (loading) return <View style={styles.container}><SkeletonList count={4} /></View>;
  if (error || !job) return <View style={styles.container}><ErrorState message={error || 'Failed to load'} onRetry={fetchJobData} /></View>;

  const isCompleted = job.status === 'Completed';
  const statusOptions = completionSelfieRequired ? ALL_STATUS_OPTIONS.filter(s => s !== 'Completed') : ALL_STATUS_OPTIONS;
  const unconfirmedMaterials = materials.filter((m: any) => m.checkout_status === 'checked_out');

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <JobDetailShell job={job}>

        {/* MATERIALS */}
        <SectionLabel
          title="MATERIALS / PARTS USED"
          rightElement={!isCompleted ? (
            <AppPressable style={styles.addBtnChip} onPress={() => setState({ showMaterialModal: true })}
              accessibilityRole="button" accessibilityLabel="Add Material">
              <Plus size={14} color={colors.textInverse} style={{ marginRight: 4 }} />
              <Text style={styles.addBtnChipText}>Add Item</Text>
            </AppPressable>
          ) : undefined}
        />
        <View style={styles.card}>
          {materials.length === 0 ? (
            <EmptyState icon={Package} message="No materials added yet"
              subMessage={!isCompleted ? 'Tap Add Item above to log parts or materials' : undefined} compact />
          ) : (
            <>
              <MaterialList materials={materials} onDelete={confirmDeleteMaterial} canEdit={!isCompleted} hidePricing />
            </>
          )}
        </View>

        {/* WORK NOTES */}
        <SectionLabel title="WORK NOTES" />
        <View style={styles.card}>
          <TextInput
            style={[styles.notesInput, notesFocused && { borderColor: colors.textPrimary }]}
            placeholder="Type your work notes here…"
            placeholderTextColor={colors.textMuted}
            multiline value={notes} onChangeText={(v) => setState({ notes: v })}
            editable={!isCompleted}
            onFocus={() => setState({ notesFocused: true })}
            onBlur={() => setState({ notesFocused: false })}
          />
        </View>

        {/* COMPLETION SELFIE GATE */}
        {completionSelfieRequired && !isCompleted && (
          <CompletionSelfieBanner onNavigate={() => navigation.navigate('OnsiteVisit', { jobId })} />
        )}

        {/* STATUS */}
        <SectionLabel title="STATUS" />
        <View style={styles.card}>
          <AppPressable
            style={[styles.statusDropdown, isCompleted && styles.dropdownDisabled]}
            onPress={() => !isCompleted && setState({ statusSelectorVisible: true })}
            disabled={isCompleted}
            accessibilityRole="button" accessibilityLabel="Change Status"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <StatusBadge status={selectedStatus} />
              {!isCompleted && <Text style={styles.statusHint}>Tap to change</Text>}
            </View>
            {!isCompleted && <ChevronDown size={20} color={colors.textSecondary} />}
          </AppPressable>
        </View>

        {/* UPDATE BUTTON */}
        {!isCompleted && (
          <View style={styles.footerWrap}>
            <Button label="Update & Notify" onPress={handleUpdate} loading={updating} disabled={updating} variant="primary" style={styles.primaryBtn} />
          </View>
        )}
      </JobDetailShell>

      <AddMaterialModal visible={showMaterialModal} jobId={jobId} onClose={() => setState({ showMaterialModal: false })} onAdded={fetchJobData} />

      {/* Status Selector Sheet */}
      <BottomSheet visible={statusSelectorVisible} onClose={() => setState({ statusSelectorVisible: false })}>
        <Text style={{ ...typography.h2, marginBottom: spacing.lg }}>Select Status</Text>
        {statusOptions.map((status) => (
          <AppPressable key={status} style={styles.statusOption}
            onPress={() => setState({ selectedStatus: status, statusSelectorVisible: false })}>
            <Text style={[styles.statusOptionText, selectedStatus === status && { color: colors.primary, ...typography.bodyBold }]}>
              {status}
            </Text>
          </AppPressable>
        ))}
      </BottomSheet>

      {/* Delete Confirm Sheet */}
      <BottomSheet visible={deleteConfirmVisible} onClose={() => setState({ deleteConfirmVisible: false })}>
        <Text style={{ ...typography.h2, marginBottom: spacing.sm }}>Delete Material</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}>
          Are you sure you want to delete this material?
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label="Cancel" variant="secondary" onPress={() => setState({ deleteConfirmVisible: false })} style={{ flex: 1 }} />
          <Button label="Delete" onPress={deleteMaterial} style={{ flex: 1, backgroundColor: colors.accentRed }} />
        </View>
      </BottomSheet>

      {/* Material Usage Modal */}
      <MaterialUsageModal
        visible={confirmingMaterialsVisible}
        materials={unconfirmedMaterials}
        usageQuantities={usageQuantities}
        updating={updating}
        onChangeQty={(id, val) => setState({ usageQuantities: { ...usageQuantities, [id]: val } })}
        onCancel={() => setState({ confirmingMaterialsVisible: false })}
        onConfirm={finalizeUpdate}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { ...typography.bodyBold, color: colors.textSecondary },
  totalValue: { ...typography.bodyBold, color: colors.textPrimary },
  notesInput: {
    backgroundColor: colors.backgroundAlt, color: colors.textPrimary, ...typography.body,
    padding: spacing.md, borderRadius: radius.md, minHeight: 100, maxHeight: 180,
    textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border,
  },
  statusDropdown: {
    backgroundColor: colors.backgroundAlt, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  dropdownDisabled: { opacity: 0.7 },
  statusHint: { ...typography.caption, color: colors.textMuted },
  statusOption: {
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    minHeight: 44, justifyContent: 'center',
  },
  statusOptionText: { ...typography.body, color: colors.textPrimary },
  footerWrap: { marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.xl },
  primaryBtn: { backgroundColor: colors.success },
  addBtnChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.pill, minHeight: 44,
  },
  addBtnChipText: { ...typography.caption, color: colors.textInverse, fontWeight: '600' },
});
