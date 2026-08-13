import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { printInvoice } from '../../lib/invoiceService';

import { supabase } from '../../lib/supabase';
import { Job, JobMaterial } from '../../types/job';
import { Billing } from '../../types/billing';
import { calculatePartsTotal, calculateTaxAmount, calculateGrandTotal, createWhatsAppUrl } from '@repairshop/shared';
import { SkeletonList } from '../../components/common/SkeletonCard';
import ErrorState from '../../components/common/ErrorState';
import AppHeader from '../../components/common/AppHeader';
import StatusBadge from '../../components/jobs/StatusBadge';
import { Printer, MessageCircle, Mail } from 'lucide-react-native';
import Button from '../../components/common/Button';
import SectionLabel from '../../components/common/SectionLabel';
import LineItemTable from '../../components/shared/LineItemTable';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { useToast } from '../../context/ToastContext';

import { BillingAdjustmentsForm, BillingTotalsCard } from '../../components/billing/BillingFormCards';

const parseNum = (val: string) => {
  const parsed = parseFloat(val);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
};

export default function BillingScreen() {
  const route = useRoute<any>();
  const jobId = route.params?.jobId;
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav_actions');
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [job, setJob] = useState<(Job & { technician_name?: string }) | null>(null);
  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [billing, setBilling] = useState<Billing | null>(null);

  const [labourStr, setLabourStr] = useState('0');
  const [taxStr, setTaxStr] = useState('0');
  const [discountStr, setDiscountStr] = useState('0');
  const [isPaid, setIsPaid] = useState(false);
  const [isNoCharge, setIsNoCharge] = useState(false);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: jobData, error: jobError } = await supabase
        .from('jobs').select('*, technician:technician_id(name)').eq('id', jobId).single();
      if (jobError) throw jobError;
      setJob({ ...jobData, technician_name: jobData.technician?.name });

      const { data: matsData, error: matsError } = await supabase
        .from('job_materials').select('*').eq('job_id', jobId);
      if (matsError) throw matsError;
      setMaterials(matsData || []);

      const { data: billData, error: billError } = await supabase
        .from('billing').select('*').eq('job_id', jobId).maybeSingle();
      if (billError) throw billError;

      if (billData) {
        setBilling(billData);
        setLabourStr(billData.labour_charge.toString());
        setTaxStr(billData.tax_percent.toString());
        setDiscountStr(billData.discount.toString());
        setIsPaid(billData.is_paid);
      } else {
        setBilling(null); setLabourStr('0'); setTaxStr('0'); setDiscountStr('0'); setIsPaid(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBillingData(); }, [jobId]));

  const partsTotal    = calculatePartsTotal(materials);
  const labourCharge  = parseNum(labourStr);
  const taxPercent    = parseNum(taxStr);
  const discount      = parseNum(discountStr);
  const taxAmount     = calculateTaxAmount(partsTotal, labourCharge, taxPercent);
  const subTotal      = partsTotal + labourCharge;
  const grandTotal    = Math.max(0, calculateGrandTotal(partsTotal, labourCharge, taxPercent, discount));
  const isBlocked     = grandTotal === 0 && !isNoCharge;

  const handleSaveBill = async () => {
    try {
      setSaving(true);
      const payload = { job_id: jobId, parts_total: partsTotal, labour_charge: labourCharge, tax_percent: taxPercent, discount, grand_total: grandTotal, is_paid: isPaid };
      const query = billing?.id
        ? supabase.from('billing').update(payload).eq('id', billing.id).select().single()
        : supabase.from('billing').upsert(payload, { onConflict: 'job_id' }).select().single();
      const { data, error } = await query;
      if (error) throw error;
      setBilling(data);
      showToast({ title: 'Success', message: 'Bill saved successfully.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Save Failed', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!job) return;
    const msg = `Hello ${job.customer_name}, your RepairShop invoice for Job ${job.job_code} is ready.\n\nSub Total: ₹${subTotal.toFixed(2)}\nTax: ₹${taxAmount.toFixed(2)}\nDiscount: ₹${discount.toFixed(2)}\n*Grand Total: ₹${grandTotal.toFixed(2)}*\n\nThank you for choosing RepairShop.`;
    const url = createWhatsAppUrl(job.customer_contact, msg);
    if (!url) { showToast({ title: 'Error', message: 'Could not format number for WhatsApp.', type: 'error' }); return; }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) { showToast({ title: 'Error', message: 'WhatsApp not installed.', type: 'error' }); return; }
      await Linking.openURL(url);
    } catch { showToast({ title: 'Error', message: 'Could not open WhatsApp.', type: 'error' }); }
  };

  const handleEmail = async () => {
    if (!job) return;
    if (!billing) { showToast({ title: 'Error', message: 'Please save bill first.', type: 'error' }); return; }
    if (!job.customer_email) { showToast({ title: 'Missing Email', message: 'No customer email found.', type: 'error' }); return; }
    try {
      showToast({ title: 'Sending...', message: 'Sending email invoice...', type: 'info' });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-invoice-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ job_id: jobId, customer_email: job.customer_email })
      });
      if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(text || 'Edge Function failed'); }
      const data = await res.json().catch(() => ({}));
      showToast({ title: 'Email Sent', message: data.message || 'Invoice emailed successfully.', type: 'success' });
    } catch (error: any) {
      showToast({ title: 'Email Failed', message: error.message, type: 'error' });
    }
  };

  const handlePrint = async () => {
    if (!job || !billing) return;
    try {
      const matItems = materials.length > 0
        ? materials.map(m => ({ description: m.material_name, hsn: '', price: m.unit_cost, unit: m.quantity }))
        : [{ description: 'Labour & Service', hsn: '', price: billing.labour_charge || 0, unit: 1 }];
      if (billing.labour_charge > 0 && materials.length > 0) {
        matItems.push({ description: 'Labour Charge', hsn: '', price: billing.labour_charge, unit: 1 });
      }
      await printInvoice({
        docType: 'final', invoiceNo: `INV-${job.job_code}`, jobId: job.job_code,
        date: new Date().toISOString(),
        customer: { name: job.customer_name, phone: job.customer_contact, address: job.device_type + ' — ' + job.reported_issue },
        items: matItems, taxRatePct: billing.tax_percent, discount: billing.discount,
      });
    } catch (e: any) { showToast({ title: 'Print Failed', message: e.message, type: 'error' }); }
  };

  if (loading) return (
    <View style={styles.container}>
      <AppHeader title="Billing" showBack={true} />
      <SkeletonList count={4} />
    </View>
  );
  if (error || !job) return (
    <View style={styles.container}>
      <AppHeader title="Billing" showBack={true} />
      <ErrorState message={error || 'Failed to load'} onRetry={fetchBillingData} />
    </View>
  );

  const lineItems = [
    ...materials.map(m => ({ id: m.id, name: m.material_name, qty: m.quantity, cost: m.total_cost / (m.quantity || 1) })),
    { id: 'labour', name: 'Labour Charges', qty: 1, cost: labourCharge }
  ].filter(item => item.cost > 0);

  return (
    <View style={styles.container}>
      <AppHeader title="Billing" showBack={true} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 140 }]}>
        {/* Job Info Header */}
        <View style={styles.header}>
          <Text style={styles.jobCode}>Invoice for {job.job_code}</Text>
          <Text style={styles.customerText}>{job.customer_name}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status={job.status} />
          </View>
        </View>

        <SectionLabel title="ITEMIZED CHARGES" />
        <View style={styles.card}>
          <LineItemTable items={lineItems} editable={false} />
        </View>

        <BillingAdjustmentsForm
          labourStr={labourStr} taxStr={taxStr} discountStr={discountStr}
          onChangeLabour={setLabourStr} onChangeTax={setTaxStr} onChangeDiscount={setDiscountStr}
        />

        <BillingTotalsCard
          subTotal={subTotal} taxAmount={taxAmount} taxPercent={taxPercent}
          discount={discount} grandTotal={grandTotal}
          isPaid={isPaid} isNoCharge={isNoCharge} isBlocked={isBlocked}
          onTogglePaid={setIsPaid} onToggleNoCharge={setIsNoCharge}
        />
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}>
        <View style={styles.secondaryActions}>
          <AppPressable style={[styles.secondaryBtn, isBlocked && { opacity: 0.5 }]} disabled={isBlocked} onPress={handlePrint}>
            <Printer size={18} color={colors.textPrimary} />
          </AppPressable>
          <AppPressable style={[styles.secondaryBtn, isBlocked && { opacity: 0.5 }]} onPress={handleWhatsApp} disabled={isBlocked}>
            <MessageCircle size={18} color={colors.textPrimary} />
          </AppPressable>
          <AppPressable style={[styles.secondaryBtn, isBlocked && { opacity: 0.5 }]} onPress={handleEmail} disabled={isBlocked}>
            <Mail size={18} color={colors.textPrimary} />
          </AppPressable>
        </View>
        <Button label="Save Billing" onPress={handleSaveBill} loading={saving} disabled={saving || isBlocked} variant="primary" style={styles.primaryBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  header: { alignItems: 'center', marginBottom: spacing.xl, paddingVertical: spacing.md },
  jobCode: { ...typography.h1, color: colors.textPrimary, marginBottom: 4 },
  customerText: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  badgeRow: { flexDirection: 'row', gap: spacing.sm },
  card: {
    backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.lg,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card,
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, ...shadow.nav,
  },
  secondaryActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  secondaryBtn: {
    flex: 1, height: 48, backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center',
  },
  primaryBtn: { width: '100%', height: 52, backgroundColor: colors.primary },
});
