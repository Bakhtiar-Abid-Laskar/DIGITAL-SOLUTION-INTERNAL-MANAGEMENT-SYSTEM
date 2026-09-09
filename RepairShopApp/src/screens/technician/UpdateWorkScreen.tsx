import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Job, JobMaterial, JobStatus, JobType } from '../../types/job';
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
import Dropdown, { DropdownOption } from '../../components/shared/Dropdown';
import { CompletionSelfieBanner } from '../../components/work/CompletionSelfieBanner';
import { ArrivalSelfieBanner } from '../../components/work/ArrivalSelfieBanner';
import { MaterialUsageModal } from '../../components/work/MaterialUsageModal';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '@repairshop/shared';
import { Plus, ChevronDown, Package, Tag, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react-native';
import { mapErrorToUserMessage } from '../../utils/errorMessages';

const ALL_STATUS_OPTIONS: JobStatus[] = ['In Progress', 'Waiting for Materials', 'Completed'];

interface CatalogItem {
  id: string;
  title: string;
  customer_charge_amount: number;
}

export default function UpdateWorkScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, role } = useAuth();
  const jobId = route.params?.jobId;
  const { showToast } = useToast();

  const [state, setState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      loading: true,
      error: null as string | null,
      job: null as Job | null,
      materials: [] as JobMaterial[],
      catalogItems: [] as CatalogItem[],
      catalogLoading: false,
      selectedCatalogId: '',
      savingServiceType: false,
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
      selectedJobType: 'Inhouse' as JobType,
      arrivalRequired: false,
      completionSelfieRequired: false,
      visitData: null as any,
    }
  );

  const {
    loading,
    error,
    job,
    materials,
    catalogItems,
    catalogLoading,
    selectedCatalogId,
    savingServiceType,
    notes,
    notesFocused,
    showMaterialModal,
    updating,
    statusSelectorVisible,
    selectedStatus,
    deleteConfirmVisible,
    materialToDelete,
    confirmingMaterialsVisible,
    usageQuantities,
    selectedJobType,
    arrivalRequired,
    completionSelfieRequired,
  } = state;

  const fetchCatalog = useCallback(async () => {
    try {
      setState({ catalogLoading: true });
      const { data, error: catErr } = await supabase
        .from('job_types')
        .select('id, title, customer_charge_amount')
        .eq('is_active', true)
        .order('title', { ascending: true });

      if (catErr) {
        console.error('Error loading job_types catalog:', catErr.message);
      } else if (data) {
        setState({ catalogItems: data as CatalogItem[] });
      }
    } catch (e: any) {
      console.error('Exception loading job_types catalog:', e);
    } finally {
      setState({ catalogLoading: false });
    }
  }, []);

  const fetchJobData = async () => {
    if (!user) return;
    if (!jobId) {
      setState({ loading: false, error: 'No Job ID provided.' });
      return;
    }

    try {
      setState({ loading: true, error: null });
      
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError || !jobData) {
        throw new Error('Job not found.');
      }

      // Fetch linked job_type catalog entry if present
      let jobTypeRef = null;
      if (jobData.job_type_ref_id) {
        const { data: jtData } = await supabase
          .from('job_types')
          .select('id, title, customer_charge_amount')
          .eq('id', jobData.job_type_ref_id)
          .maybeSingle();
        jobTypeRef = jtData;
      }

      // Fetch assigned technicians
      const { data: jobTechsData } = await supabase
        .from('job_technicians')
        .select('technician_id, removed_at')
        .eq('job_id', jobId)
        .is('removed_at', null);

      // Check if user is assigned or has staff privileges (Admin/Receptionist)
      const isAssigned =
        role === 'admin' ||
        role === 'receptionist' ||
        jobData.technician_id === user.id ||
        (jobTechsData && jobTechsData.some((jt: any) => jt.technician_id === user.id));

      if (!isAssigned) {
        throw new Error('This job is not assigned to you.');
      }

      const fullJob: Job = {
        ...jobData,
        job_type_ref: jobTypeRef,
        job_technicians: jobTechsData || [],
      };

      // Server-side authoritative verification of onsite check-in gate
      let isArrivalRequired = false;
      let isCompletionRequired = false;
      let visitRecord = null;

      if (jobData.job_type === 'Onsite' && role === 'technician') {
        const { data: visitData, error: visitErr } = await supabase
          .from('onsite_visits')
          .select('*')
          .eq('job_id', jobId)
          .eq('technician_id', user.id)
          .order('arrival_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (visitErr) {
          console.error('[UpdateWorkScreen fetchJobData] visit fetch error:', visitErr);
        }

        visitRecord = visitData;
        const hasArrivalSelfie = !!(visitData?.arrival_selfie_drive_file_id || visitData?.arrival_selfie_url);
        const hasDepartureSelfie = !!(visitData?.departure_selfie_drive_file_id || visitData?.departure_selfie_url);

        if (!hasArrivalSelfie) {
          isArrivalRequired = true;
        } else if (!hasDepartureSelfie && jobData.status !== 'Completed') {
          isCompletionRequired = true;
        }
      }

      setState({
        job: fullJob,
        notes: jobData.work_notes || '',
        selectedStatus: jobData.status,
        selectedCatalogId: jobData.job_type_ref_id || '',
        selectedJobType: jobData.job_type || 'Inhouse',
        arrivalRequired: isArrivalRequired,
        completionSelfieRequired: isCompletionRequired,
        visitData: visitRecord,
      });

      const { data: matsData } = await supabase
        .from('job_materials')
        .select('*')
        .eq('job_id', jobId);

      if (matsData) setState({ materials: matsData });

      // If arrival check-in is required, automatically route technician to OnsiteVisitScreen
      if (isArrivalRequired) {
        navigation.replace('OnsiteVisit', { jobId });
        return;
      }
    } catch (err: any) {
      console.error('[UpdateWorkScreen fetchJobData]', err);
      setState({ error: mapErrorToUserMessage(err) });
    } finally {
      setState({ loading: false });
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!jobId) return;
      fetchJobData();
      fetchCatalog();
      const channel = supabase
        .channel(`update-work-${jobId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` }, fetchJobData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'job_materials', filter: `job_id=eq.${jobId}` }, fetchJobData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'onsite_visits', filter: `job_id=eq.${jobId}` }, fetchJobData)
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }, [jobId, fetchCatalog])
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

  const handleChangeJobLocationType = async (val: JobType) => {
    setState({ selectedJobType: val });
    try {
      const { error } = await supabase.from('jobs').update({ job_type: val }).eq('id', jobId);
      if (error) throw error;
      showToast({ title: 'Success', message: `Job location type changed to ${val}`, type: 'success' });
      await fetchJobData();
    } catch (err: any) {
      showToast({ title: 'Update Failed', message: mapErrorToUserMessage(err), type: 'error' });
      fetchJobData();
    }
  };

  const handleAssignServiceType = async () => {
    if (!selectedCatalogId) {
      showToast({
        title: 'Select Service Type',
        message: 'Please select a service / repair type from the catalog.',
        type: 'error',
      });
      return;
    }
    setState({ savingServiceType: true });
    try {
      const { error: rpcError } = await supabase.rpc('set_job_service_type', {
        p_job_id: jobId,
        p_job_type_ref_id: selectedCatalogId,
        p_user_id: user!.id,
      });
      if (rpcError) throw rpcError;
      showToast({
        title: 'Service Type Assigned',
        message: 'Diagnosis confirmed. You can now log parts and update progress.',
        type: 'success',
      });
      await fetchJobData();
    } catch (err: any) {
      showToast({
        title: 'Assignment Failed',
        message: mapErrorToUserMessage(err),
        type: 'error',
      });
    } finally {
      setState({ savingServiceType: false });
    }
  };

  const handleOpenAddMaterial = () => {
    if (!job?.job_type_ref_id) {
      showToast({
        title: 'Diagnosis Required',
        message: 'Please select and confirm the Service / Repair Type before adding materials.',
        type: 'error',
      });
      return;
    }
    setState({ showMaterialModal: true });
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
        const { error } = await supabase.from('jobs').update(updates).eq('id', jobId);
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
    if (!job.job_type_ref_id) {
      showToast({
        title: 'Diagnosis Required',
        message: 'Please select and confirm the Service / Repair Type before updating status or completing work.',
        type: 'error',
      });
      return;
    }
    if (selectedStatus === 'Completed' && completionSelfieRequired) {
      showToast({
        title: 'Completion Selfie Required',
        message: 'You must capture a departure selfie at the customer location before completing this job.',
        type: 'error',
      });
      return;
    }
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

  if (arrivalRequired) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <JobDetailShell job={job}>
          <ArrivalSelfieBanner onNavigate={() => navigation.navigate('OnsiteVisit', { jobId })} />
        </JobDetailShell>
      </KeyboardAvoidingView>
    );
  }

  const isCompleted = job.status === 'Completed';
  const hasServiceType = !!job.job_type_ref_id;
  const statusOptions = completionSelfieRequired ? ALL_STATUS_OPTIONS.filter(s => s !== 'Completed') : ALL_STATUS_OPTIONS;
  const unconfirmedMaterials = materials.filter((m: any) => m.checkout_status === 'checked_out');

  const catalogOptions: DropdownOption[] = catalogItems.map((item: CatalogItem) => ({
    label: `${item.title} (Customer Rate: ₹${item.customer_charge_amount})`,
    value: item.id,
  }));

  const selectedCatalogItem = catalogItems.find((item: CatalogItem) => item.id === selectedCatalogId);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <JobDetailShell job={job}>

        {/* JOB LOCATION TYPE */}
        <SectionLabel title="JOB LOCATION" />
        <View style={styles.card}>
          <Dropdown
            options={[
              { label: 'Inhouse', value: 'Inhouse' },
              { label: 'Onsite', value: 'Onsite' },
            ]}
            selectedValue={selectedJobType}
            onSelect={(val) => handleChangeJobLocationType(val as JobType)}
            disabled={isCompleted}
          />
        </View>

        {/* SERVICE / REPAIR TYPE SECTION */}
        <SectionLabel
          title="SERVICE / REPAIR TYPE"
          rightElement={
            !hasServiceType ? (
              <View style={styles.pendingBadge}>
                <AlertTriangle size={12} color={colors.warningAmber} />
                <Text style={styles.pendingBadgeText}>Action Required</Text>
              </View>
            ) : (
              <View style={styles.confirmedBadge}>
                <CheckCircle2 size={12} color={colors.accentGreen} />
                <Text style={styles.confirmedBadgeText}>Diagnosed</Text>
              </View>
            )
          }
        />
        <View style={[styles.card, !hasServiceType && styles.cardHighlight]}>
          {!hasServiceType ? (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.diagnosisHelperText}>
                Diagnose the device and assign the Service / Repair Type to establish baseline labor and customer pricing.
              </Text>
              <Dropdown
                options={catalogOptions}
                selectedValue={selectedCatalogId}
                onSelect={(val) => setState({ selectedCatalogId: val })}
                placeholder={catalogLoading ? "Loading repair catalog..." : "Select Service / Repair Type"}
                icon={<Tag size={18} color={colors.textMuted} />}
              />
              {selectedCatalogItem && (
                <View style={styles.catalogPreview}>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Customer Rate:</Text>
                    <Text style={styles.previewValue}>₹{selectedCatalogItem.customer_charge_amount}</Text>
                  </View>
                </View>
              )}
              <Button
                label="Confirm Service Type & Start Work"
                onPress={handleAssignServiceType}
                loading={savingServiceType}
                disabled={!selectedCatalogId || savingServiceType}
                variant="primary"
                style={{ marginTop: spacing.xs }}
              />
            </View>
          ) : (
            <View style={{ gap: spacing.xs }}>
              <View style={styles.serviceTitleRow}>
                <Wrench size={18} color={colors.primary} />
                <Text style={styles.serviceTitleText}>
                  {job.job_type_ref?.title || 'Standard Service'}
                </Text>
              </View>
              <View style={styles.serviceDetailsRow}>
                <Text style={styles.serviceDetailText}>
                  Customer Rate: ₹{job.job_type_ref?.customer_charge_amount || 0}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* MATERIALS */}
        <SectionLabel
          title="MATERIALS / PARTS USED"
          rightElement={!isCompleted ? (
            <AppPressable style={styles.addBtnChip} onPress={handleOpenAddMaterial}
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
  cardHighlight: {
    borderColor: colors.accentBlue,
    borderWidth: 1.5,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningAmberBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pendingBadgeText: {
    ...typography.micro,
    color: colors.warningAmber,
    fontWeight: '700',
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.statusCompletedBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  confirmedBadgeText: {
    ...typography.micro,
    color: colors.accentGreen,
    fontWeight: '700',
  },
  diagnosisHelperText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  catalogPreview: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  previewValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  serviceTitleText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  serviceDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  serviceDetailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  serviceDetailDot: {
    color: colors.textMuted,
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
