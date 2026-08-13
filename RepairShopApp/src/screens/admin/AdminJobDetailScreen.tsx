import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { Job, JobMaterial } from '../../types/job';
import { mapErrorToUserMessage } from '../../utils/errorMessages';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';

import JobDetailShell from '../../components/jobs/JobDetailShell';
import SectionLabel from '../../components/common/SectionLabel';
import TechnicianPicker from '../../components/jobs/TechnicianPicker';
import { SkeletonList } from '../../components/common/SkeletonCard';
import ErrorState from '../../components/common/ErrorState';
import LineItemTable from '../../components/shared/LineItemTable';
import AppHeader from '../../components/common/AppHeader';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useToast } from '../../context/ToastContext';
import { ChevronRight } from 'lucide-react-native';


export default function AdminJobDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const jobId = route.params?.jobId;
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<(Job & { technician_name?: string }) | null>(null);
  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [showTechPicker, setShowTechPicker] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*, technician:technician_id(name)')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setJob({ ...jobData, technician_name: jobData.technician?.name });

      const { data: matsData, error: matsError } = await supabase
        .from('job_materials')
        .select('*')
        .eq('job_id', jobId);

      if (matsError) throw matsError;
      setMaterials(matsData || []);
    } catch (err: any) {
      setError(mapErrorToUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useRealtimeSubscription('jobs', fetchJobDetails, jobId ? `id=eq.${jobId}` : undefined);
  useRealtimeSubscription('job_materials', fetchJobDetails, jobId ? `job_id=eq.${jobId}` : undefined);

  useFocusEffect(
    useCallback(() => {
      fetchJobDetails();
    }, [jobId])
  );

  const handleReassign = async (technicianId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ technician_id: technicianId })
        .eq('id', jobId);

      if (error) throw error;

      setFeedbackMsg('Technician reassigned successfully.');
      setTimeout(() => setFeedbackMsg(null), 3000);
      fetchJobDetails();
    } catch (err: any) {
      showToast({ title: 'Reassign Failed', message: mapErrorToUserMessage(err), type: 'error' });
    }
  };

  if (loading) return (
    <View style={styles.container}>
      <AppHeader title="Job Details" showBack={true} />
      <SkeletonList count={3} />
    </View>
  );
  if (error || !job) return (
    <View style={styles.container}>
      <AppHeader title="Error" showBack={true} />
      <ErrorState message={error || 'Job not found'} onRetry={fetchJobDetails} />
    </View>
  );

  const lineItems = React.useMemo(() => materials.map(m => ({
    id: m.id,
    name: m.material_name,
    qty: m.quantity,
    cost: m.total_cost / (m.quantity || 1),
  })), [materials]);

  return (
    <View style={styles.container}>
      <JobDetailShell job={job} feedbackMessage={feedbackMsg}>

        {/* Materials */}
        <SectionLabel title="MATERIALS" />
        <View style={{ marginHorizontal: spacing.lg }}>
          {lineItems.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.mutedText}>No materials logged.</Text>
            </View>
          ) : (
            <LineItemTable items={lineItems} editable={false} />
          )}
        </View>

        {/* Technician reassignment */}
        <SectionLabel title="ASSIGNED TECHNICIAN" />
        <AppPressable
          style={[styles.card, styles.techCard, { marginBottom: spacing.xl }]}
          onPress={() => setShowTechPicker(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Technician</Text>
            <Text style={[styles.rowValue, { marginTop: 4 }]}>
              {job.technician_name || 'Unassigned'}
            </Text>
          </View>
          <View style={styles.reassignBtn}>
            <Text style={styles.reassignBtnText}>Reassign</Text>
            <ChevronRight size={14} color={colors.textPrimary} />
          </View>
        </AppPressable>

      </JobDetailShell>

      <TechnicianPicker
        visible={showTechPicker}
        onClose={() => setShowTechPicker(false)}
        onSelect={(id) => { setShowTechPicker(false); handleReassign(id); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  mutedText: {
    ...typography.body,
    color: colors.textMuted,
  },
  techCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rowValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  reassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reassignBtnText: { ...typography.label, color: colors.textPrimary },
});
