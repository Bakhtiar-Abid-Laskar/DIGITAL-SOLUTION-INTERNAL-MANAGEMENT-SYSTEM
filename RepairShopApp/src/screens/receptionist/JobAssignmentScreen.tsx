import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal,  } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useNavigation, useRoute } from '@react-navigation/native';
import { printInvoice } from '../../lib/invoiceService';
import { CheckCircle2, Printer, ChevronRight, MessageCircle } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Linking } from 'react-native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { NewJobFormValues } from '../../types/job';
import { cleanPhoneNumber } from '@repairshop/shared';

import TechnicianPicker from '../../components/jobs/TechnicianPicker';
import AppHeader from '../../components/common/AppHeader';
import SectionLabel from '../../components/common/SectionLabel';
import DetailRow from '../../components/common/DetailRow';
import Button from '../../components/common/Button';
import ScreenScrollView from '../../components/common/ScreenScrollView';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useToast } from '../../context/ToastContext';
import { createWhatsAppUrl } from '@repairshop/shared';

export default function JobAssignmentScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const formState = route.params?.formState as NewJobFormValues;

  const [state, setState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      loading: false,
      showTechPicker: false,
      createdJob: null as any,
      technicianIds: [] as string[],
      techNames: [] as string[],
    }
  );

  const { loading, showTechPicker, createdJob, technicianIds, techNames } = state;

  const submitJob = async () => {
    setState({ loading: true });
    try {
      const { data: jobCode, error: rpcError } = await supabase.rpc('generate_job_code');
      if (rpcError || !jobCode) throw new Error(rpcError?.message || 'Failed to generate job code.');

      // Central Customer Directory: Upsert or link customer
      let customerId = formState.customer_id || null;
      try {
        const { data: custData, error: custErr } = await supabase.rpc('find_or_create_customer', {
          p_customer_id: customerId,
          p_name: formState.customer_name.trim(),
          p_phone: cleanPhoneNumber(formState.customer_contact) || null,
          p_email: formState.customer_email.trim() || null,
          p_gstin: formState.customer_gstin?.trim() || null,
          p_address: formState.customer_address?.trim() || null,
          p_created_via: 'job',
          p_user_id: user?.id,
        });
        if (!custErr && custData) {
          customerId = custData.id;
        }
      } catch (e) {
        console.warn('Customer upsert warning:', e);
      }

      // Central Device Types: Resolve or create device type via RPC
      let resolvedDeviceTypeId = formState.device_type_id?.trim() || 'Other';
      try {
        const { data: dtId, error: dtErr } = await supabase.rpc('find_or_create_device_type', {
          p_name: resolvedDeviceTypeId,
        });
        if (!dtErr && dtId) {
          resolvedDeviceTypeId = dtId;
        }
      } catch (e) {
        console.warn('Device type resolution warning:', e);
      }

      const { data: newJob, error: insertError } = await supabase.from('jobs').insert({
        job_code: jobCode,
        customer_id:      customerId,
        customer_name:    formState.customer_name.trim(),
        customer_contact: cleanPhoneNumber(formState.customer_contact),
        customer_email:   formState.customer_email.trim() || null,
        customer_gstin:   formState.customer_gstin?.trim() || null,
        customer_address: formState.customer_address?.trim() || null,
        device_type_id:   resolvedDeviceTypeId,
        reported_issue:   formState.reported_issue.trim(),
        remarks:          formState.remarks.trim() || null,
        job_type:         formState.job_type,
        job_type_ref_id:  formState.job_type_ref_id || null,
        snap_technician_incentive:   formState.snap_technician_incentive || 0,
        priority:         formState.priority,
        status:           'Received',
        receptionist_id:  user?.id,
        technician_id:    technicianIds.length > 0 ? technicianIds[0] : null,
      }).select().single();

      if (insertError) throw insertError;

      if (technicianIds.length > 1) {
        const techs = technicianIds.slice(1).map((id: string) => ({
          job_id: newJob.id,
          technician_id: id
        }));
        const { error: additionalError } = await supabase.from('job_technicians').insert(techs);
        if (additionalError) throw additionalError;
      }

      setState({ createdJob: newJob });
    } catch (error: any) {
      showToast({ title: 'Error Creating Job', message: error.message, type: 'error' });
    } finally {
      setState({ loading: false });
    }
  };

  const printReceipt = async () => {
    if (!createdJob) return;
    try {
      await printInvoice({ docType: 'receipt', jobId: createdJob.id });
    } catch (error: any) {
      showToast({ title: 'Print Failed', message: error.message, type: 'error' });
    }
  };

  const resetFlow = () => {
    setState({ createdJob: null });
    navigation.navigate('New Job'); // Navigate back to step 1
  };

  const goHome = () => {
    setState({ createdJob: null });
    navigation.navigate('ReceptionistTabs', { screen: 'Dashboard' });
  };

  const priorityColor = 
    formState.priority === 'Urgent' ? colors.statusUrgentFg :
    formState.priority === 'High' ? colors.statusInProgressFg : colors.statusCompletedFg;

  const handleWhatsAppInvoice = async () => {
    if (!createdJob) return;
    const msg = `Hello ${createdJob.customer_name.trim()},\n\nYour device has been registered for repair successfully.\n\nJob ID: ${createdJob.job_code}\nDevice: ${createdJob.device_type}\nIssue: ${createdJob.reported_issue}\n\nThank you for choosing RepairShop.`;
    const url = createWhatsAppUrl(createdJob.customer_contact, msg);
    if (!url) {
      showToast({ title: 'Invalid number', message: 'Could not format the contact number for WhatsApp.', type: 'error' });
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        showToast({ title: 'WhatsApp unavailable', message: 'WhatsApp is not installed.', type: 'error' });
        return;
      }
      await Linking.openURL(url);
    } catch (err: any) {
      showToast({ title: 'WhatsApp failed', message: err.message, type: 'error' });
    }
  };

  if (createdJob) {
    return (
      <View style={styles.container}>
        <AppHeader title="Job Created" />
        <View style={styles.successWrap}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Job recorded</Text>
            <Text style={styles.saleCode}>{createdJob.job_code}</Text>
            
            <View style={styles.successActionsGrid}>
              <AppPressable
                style={styles.invoiceActionCard}
                onPress={printReceipt}
              >
                <Printer size={20} color={colors.primary} />
                <Text style={styles.invoiceActionText}>Print</Text>
              </AppPressable>

              <AppPressable style={styles.invoiceActionCard} onPress={handleWhatsAppInvoice}>
                <MessageCircle size={20} color={colors.accentGreen} />
                <Text style={styles.invoiceActionText}>WhatsApp</Text>
              </AppPressable>
            </View>
            <View style={styles.successActions}>
              <Button label="Create Another" onPress={resetFlow} style={styles.successButton} />
              <Button label="Done" variant="secondary" onPress={goHome} style={styles.successButton} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Job Assignment" showBack={true} />

      <ScreenScrollView
        mode="nav_actions"
        contentContainerStyle={styles.scrollContent}
      >
        <SectionLabel title="JOB OVERVIEW" />
        <View style={styles.card}>
          <DetailRow label="Job ID"    value={createdJob ? createdJob.job_code : 'Auto-generated on save'} showDivider />
          <DetailRow label="Priority" value={formState.priority} valueColor={priorityColor} showDivider />
          <DetailRow label="Job Type" value={formState.job_type} showDivider />
          <DetailRow label="Customer" value={formState.customer_name} showDivider />
          <DetailRow label="Device"   value={formState.device_type_id} showDivider />
          <View style={styles.issueBlock}>
            <Text style={styles.issueLabel}>Issue</Text>
            <Text style={styles.issueValue}>{formState.reported_issue}</Text>
          </View>
        </View>

        <SectionLabel title="ASSIGNMENT (OPTIONAL)" />
        <Text style={styles.fieldLabel}>Select Technician</Text>
        <AppPressable
          style={styles.techSelectBtn}
          onPress={() => setState({ showTechPicker: true })}
        >
          <Text style={techNames.length > 0 ? styles.techTextSelected : styles.techTextPlaceholder}>
            {techNames.length > 0 ? techNames.join(', ') : 'Unassigned (Tap to select)'}
          </Text>
          <ChevronRight size={20} color={colors.textMuted} />
        </AppPressable>
      </ScreenScrollView>

      {/* Footer Actions — sits above the flat tab bar; insets.bottom handles OS nav area */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.footerRow}>

          <Button
            label={createdJob ? "Created" : "Create Job"}
            onPress={submitJob}
            loading={loading}
            style={[{ flex: 1 }, { backgroundColor: colors.primary }]}
            disabled={!!createdJob}
          />
        </View>
      </View>

      <TechnicianPicker
        visible={showTechPicker}
        initialSelectedIds={technicianIds}
        onClose={() => setState({ showTechPicker: false })}
        onSelect={(ids, names) => {
          setState({ technicianIds: ids, techNames: names, showTechPicker: false });
        }}
      />

      </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  techCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  issueBlock: {
    paddingVertical: spacing.sm,
  },
  issueLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  issueValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },

  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  techSelectBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg 
  },
  techTextPlaceholder: { ...typography.body, color: colors.textMuted },
  techTextSelected: { ...typography.body, color: colors.textPrimary },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerBtnHalf: {
    flex: 1,
  },

  successWrap: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  successTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  saleCode: {
    ...typography.h1,
    color: colors.navBackground,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  successActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  successButton: {
    flex: 1,
  },
  successActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  invoiceActionCard: {
    flexGrow: 1,
    minWidth: '40%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    gap: spacing.xs,
  },
  invoiceActionText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
});
