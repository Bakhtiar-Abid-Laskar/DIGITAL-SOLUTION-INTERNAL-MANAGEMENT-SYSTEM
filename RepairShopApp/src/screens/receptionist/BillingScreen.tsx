import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Job, JobMaterial } from '../../types/job';
import {
  formatCurrency,
  createWhatsAppUrl,
  calculateBillingTotals,
  ItemizedBillLine,
  reverseCalcBillFromGrandTotal,
  LineItem,
} from '@repairshop/shared';
import { SkeletonList } from '../../components/common/SkeletonCard';
import ErrorState from '../../components/common/ErrorState';
import AppHeader from '../../components/common/AppHeader';
import StatusBadge from '../../components/jobs/StatusBadge';
import { Printer, MessageCircle, Mail, ArrowRight, ArrowLeft, CheckCircle2, Hash, Wrench, Package } from 'lucide-react-native';
import Button from '../../components/common/Button';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { useToast } from '../../context/ToastContext';
import { usePdfGenerator } from '../../context/PdfProgressContext';

import ItemizedBillTable, { ItemizedLineItem } from '../../components/billing/ItemizedBillTable';
import ItemizedBillTotals from '../../components/billing/ItemizedBillTotals';
import PaymentRecordingBox from '../../components/billing/PaymentRecordingBox';

export default function BillingScreen() {
  const route = useRoute<any>();
  const jobId = route.params?.jobId;
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav_actions');
  const { showToast } = useToast();
  const { generatePdf } = usePdfGenerator();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [job, setJob] = useState<(Job & { technician_name?: string; job_type_ref?: any }) | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any>(null);

  // Step 1 = Review; Step 2 = Itemized Bill
  const [step, setStep] = useState<'review' | 'itemized'>('review');
  const [itemizedLines, setItemizedLines] = useState<ItemizedLineItem[]>([]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch job with linked job_type, technician, and serial_number
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          technician:users!jobs_technician_id_fkey(name, phone),
          job_type_ref:job_types!jobs_job_type_ref_id_fkey(id, title, customer_charge_amount)
        `)
        .eq('id', jobId)
        .single();
      if (jobError) throw jobError;
      setJob({ ...jobData, technician_name: jobData.technician?.name });

      // Fetch job materials with linked product HSN
      const { data: matsData, error: matsError } = await supabase
        .from('job_materials')
        .select('*, product:products(hsn_sac)')
        .eq('job_id', jobId);
      if (matsError) throw matsError;
      setMaterials(matsData || []);

      // Fetch existing invoice if already created
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('job_id', jobId)
        .maybeSingle();
      if (invError) throw invError;

      if (invData) {
        setInvoice(invData);
        setStep('itemized'); // Open directly into itemized view if invoice exists

        // Map existing invoice_items into itemized lines
        const loadedLines: ItemizedLineItem[] = (invData.invoice_items || []).map((it: any) => {
          const isLabour = it.item_name === 'Labour Charge' || it.item_name === 'Service Charge' || it.item_name === jobData?.job_type_ref?.title;
          const taxPct = it.tax_percent !== undefined && it.tax_percent !== null
            ? Number(it.tax_percent)
            : Number(it.cgst_rate || 0) + Number(it.sgst_rate || 0) || Number(it.igst_rate || 0) || 18;

          return {
            id: it.id,
            item_name: it.item_name,
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.selling_rate) || 0,
            tax_percent: taxPct,
            hsn_code: it.hsn_code || null,
            serial_number: it.serial_number || null,
            is_labour: isLabour,
            product_id: it.product_id || null,
          };
        });
        setItemizedLines(loadedLines);
      } else {
        setInvoice(null);
        setStep('review'); // New bill starts on review step

        // Build default itemized lines from materials + linked service charge
        const defaultLines: ItemizedLineItem[] = (matsData || []).map((m: any) => ({
          id: m.id,
          item_name: m.material_name,
          quantity: Number(m.quantity) || 1,
          unit_price: Number(m.unit_cost) || 0,
          tax_percent: 18, // defaults to 18%
          hsn_code: m.product?.hsn_sac || null,
          is_labour: false,
          product_id: m.product_id || null,
        }));

        const serviceCharge = Number(jobData?.job_type_ref?.customer_charge_amount) || 0;
        const serviceTitle = jobData?.job_type_ref?.title || 'Service / Labour Charge';
        if (serviceCharge > 0 || defaultLines.length === 0) {
          defaultLines.push({
            id: 'job-labour-line',
            item_name: serviceTitle,
            quantity: 1,
            unit_price: serviceCharge,
            tax_percent: 18, // defaults to 18%
            is_labour: true,
          });
        }
        setItemizedLines(defaultLines);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBillingData(); }, [jobId]));

  const handleUpdateLine = (id: string, updates: Partial<ItemizedLineItem>) => {
    setItemizedLines(prev =>
      prev.map(line => (line.id === id ? { ...line, ...updates } : line))
    );
  };

  const handleUpdateGrandTotal = (newGrandTotal: number) => {
    const lineItems: LineItem[] = itemizedLines.map(l => ({
      id: l.id,
      qty: Number(l.quantity) || 1,
      rate: Number(l.unit_price) || 0,
      taxPct: Number(l.tax_percent) || 18,
    }));

    const result = reverseCalcBillFromGrandTotal(lineItems, newGrandTotal, 'intra_state');

    setItemizedLines(prev =>
      prev.map(line => {
        const scaled = result.items.find(si => si.id === line.id);
        if (!scaled) return line;
        return {
          ...line,
          unit_price: scaled.rate,
          line_total_input: scaled.lineTotal.toFixed(2),
          is_rate_auto_derived: true,
        };
      })
    );
  };

  // Calculations via shared billing functions
  const billingTotals = useMemo(() => calculateBillingTotals({ items: itemizedLines }), [itemizedLines]);
  const subtotal = billingTotals.subtotal;
  const totalTax = billingTotals.taxAmount;
  const grandTotal = billingTotals.grandTotal;

  const handleSaveBill = async () => {
    if (invoice?.id && invoice?.status === 'paid') {
      Alert.alert(
        'Update Paid Invoice?',
        `This will change the recorded rate/tax for this bill from ₹${Number(invoice.grand_total || 0).toFixed(2)} to ₹${grandTotal.toFixed(2)}. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => void executeSaveBill() },
        ]
      );
      return;
    }
    await executeSaveBill();
  };

  const executeSaveBill = async () => {
    try {
      setSaving(true);
      const itemsToBill = itemizedLines.map(line => {
        const qty = Number(line.quantity) || 1;
        const rate = Number(line.unit_price) || 0;
        const taxRate = Number(line.tax_percent) || 18;
        return {
          product_id: line.product_id || null,
          item_name: line.item_name,
          quantity: qty,
          unit_price: rate,
          selling_rate: rate,
          selling_amount: qty * rate,
          tax_percent: taxRate,
          hsn_code: line.hsn_code || null,
          serial_number: line.serial_number || null,
        };
      });

      let newInvoice = invoice;
      if (!invoice?.id) {
        // Resolve or create customer record — required by the new create_invoice signature
        let customerId: string | null = null;
        if (job?.customer_name) {
          const { data: custData } = await supabase.rpc('find_or_create_customer', {
            p_customer_id: null,
            p_name: job.customer_name,
            p_phone: job.customer_contact || null,
            p_email: job.customer_email || null,
            p_gstin: job.customer_gstin || null,
            p_address: null,
            p_created_via: 'job',
            p_user_id: null,
          });
          if (custData?.id) customerId = custData.id;
        }
        if (!customerId) throw new Error('Could not resolve customer. Ensure a customer record exists before saving billing.');

        // Create new invoice atomically via create_invoice RPC
        const { data, error } = await supabase.rpc('create_invoice', {
          p_customer_name: job?.customer_name || 'Walk-in',
          p_customer_id: customerId,
          p_customer_contact: job?.customer_contact || null,
          p_customer_email: job?.customer_email || null,
          p_customer_gstin: job?.customer_gstin || null,
          p_items: itemsToBill,
          p_discount: 0,
          p_payment_method: 'Cash',
          p_status: 'draft',
          p_job_id: jobId,
        });
        if (error) throw error;

        // Fetch refreshed invoice
        const { data: fetchInv } = await supabase
          .from('invoices')
          .select('*, invoice_items(*)')
          .eq('job_id', jobId)
          .single();
        newInvoice = fetchInv;
      } else {
        // Update existing invoice fields
        const { error: updateError } = await supabase.from('invoices').update({
          customer_name: job?.customer_name || 'Walk-in',
          customer_contact: job?.customer_contact || null,
          customer_email: job?.customer_email || null,
          customer_gstin: job?.customer_gstin || null,
          subtotal: subtotal,
          total_tax: totalTax,
          discount: 0,
          grand_total: grandTotal,
        }).eq('id', invoice.id);
        if (updateError) throw updateError;

        // Synchronize invoice_items with snapshotted tax_percent and hsn_code
        await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);
        const newInvoiceItems = itemsToBill.map(it => {
          const taxable = it.selling_amount;
          const taxPct = it.tax_percent || 18;
          const cgstRate = roundMoney(taxPct / 2);
          const sgstRate = roundMoney(taxPct / 2);
          const cgstAmt = roundMoney(taxable * cgstRate / 100);
          const sgstAmt = roundMoney(taxable * sgstRate / 100);
          return {
            invoice_id: invoice.id,
            product_id: it.product_id,
            item_name: it.item_name,
            quantity: it.quantity,
            selling_rate: it.selling_rate,
            hsn_code: it.hsn_code,
            tax_percent: taxPct,
            cgst_rate: cgstRate,
            sgst_rate: sgstRate,
            igst_rate: 0,
            taxable_amount: taxable,
            cgst_amount: cgstAmt,
            sgst_amount: sgstAmt,
            igst_amount: 0,
            line_total: taxable + cgstAmt + sgstAmt,
            discount_amount: 0,
            serial_number: it.serial_number,
          };
        });

        if (newInvoiceItems.length > 0) {
          const { error: itemsErr } = await supabase.from('invoice_items').insert(newInvoiceItems);
          if (itemsErr) throw itemsErr;
        }

        const { data: fetchInv } = await supabase
          .from('invoices')
          .select('*, invoice_items(*)')
          .eq('job_id', jobId)
          .single();
        newInvoice = fetchInv;
      }

      // Claim serial numbers if any parts selected tracked units
      const serialClaims = itemizedLines
        .map((line, idx) => ({
          line_index: idx,
          product_id: line.product_id || null,
          serial_ids: line.selected_serial_ids || [],
        }))
        .filter((c) => c.serial_ids.length > 0);

      if (serialClaims.length > 0 && newInvoice?.id) {
        try {
          await supabase.rpc('claim_invoice_serials', {
            p_invoice_id: newInvoice.id,
            p_claims: serialClaims,
          });
        } catch (cErr: any) {
          console.warn('Job billing serial claim warning:', cErr);
        }
      }

      setInvoice(newInvoice);
      showToast({ title: 'Success', message: 'Itemized bill saved successfully.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Save Failed', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!job) return;
    const finalTotal = invoice?.grand_total ?? grandTotal;

    try {
      showToast({ title: 'Sending...', message: 'Dispatching WhatsApp invoice...', type: 'info' });
      const { data, error } = await supabase.functions.invoke('notify-on-finance-event', {
        body: {
          action: 'SEND_INVOICE_PDF',
          phone: job.customer_contact,
          customerName: job.customer_name,
          invoiceCode: invoice?.invoice_code || job.job_code,
          grandTotal: finalTotal,
          jobId: jobId,
        },
      });

      if (!error && data?.success) {
        showToast({ title: 'WhatsApp Sent', message: 'Invoice sent to customer WhatsApp.', type: 'success' });
        return;
      }
    } catch {
      // Fall through to client deep link
    }

    // Fallback: Open WhatsApp directly on device
    const msg = `Hello ${job.customer_name}, your Digital Solution itemized invoice for Job ${job.job_code} is ready.\n\nSubtotal: ₹${subtotal.toFixed(2)}\nTax: ₹${totalTax.toFixed(2)}\n*Grand Total: ₹${finalTotal.toFixed(2)}*\n\nThank you for choosing Digital Solution.`;
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
    if (!invoice) { showToast({ title: 'Error', message: 'Please save bill first.', type: 'error' }); return; }
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
    if (!job) return;
    if (invoice?.id) {
      await generatePdf({
        request: { docType: 'final', invoiceId: invoice.id },
        title: 'Generating Invoice',
        mode: 'print',
      });
    } else {
      await generatePdf({
        request: { docType: 'receipt', jobId: job.id },
        title: 'Generating Receipt',
        mode: 'print',
      });
    }
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

  return (
    <View style={styles.container}>
      <AppHeader
        title={step === 'review' ? 'Bill Review' : 'Itemized Bill'}
        showBack={true}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 140 }]}>
        {/* Job Info Header */}
        <View style={styles.header}>
          <Text style={styles.jobCode}>{job.job_code}</Text>
          <Text style={styles.customerText}>{job.customer_name} • {job.customer_contact}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status={job.status} />
          </View>
        </View>

        {/* ─── STEP 1: REVIEW SCREEN ────────────────────────────────────────── */}
        {step === 'review' ? (
          <View style={styles.stepContainer}>
            {job.serial_number ? (
              <View style={styles.reviewSerialBanner}>
                <Hash size={16} color={colors.primary} />
                <Text style={styles.reviewSerialText}>Device S/N: {job.serial_number}</Text>
              </View>
            ) : null}

            {/* Review Summary Card */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>Billable Items Summary</Text>

              {/* Service Charge */}
              <View style={styles.reviewItemRow}>
                <View style={styles.reviewItemLeft}>
                  <Wrench size={16} color={colors.primary} />
                  <Text style={styles.reviewItemName}>{job.job_type_ref?.title || 'Service / Labour'}</Text>
                </View>
                <Text style={styles.reviewItemPrice}>
                  {formatCurrency(Number(job.job_type_ref?.customer_charge_amount) || 0)}
                </Text>
              </View>

              {/* Materials */}
              {materials.map((m) => (
                <View key={m.id} style={styles.reviewItemRow}>
                  <View style={styles.reviewItemLeft}>
                    <Package size={16} color={colors.textSecondary} />
                    <Text style={styles.reviewItemName} numberOfLines={1}>
                      {m.material_name} (×{m.quantity})
                    </Text>
                  </View>
                  <Text style={styles.reviewItemPrice}>
                    {formatCurrency(Number(m.total_cost) || 0)}
                  </Text>
                </View>
              ))}

              {materials.length === 0 && !job.job_type_ref?.customer_charge_amount && (
                <Text style={styles.emptyMaterialsText}>No materials or service charges logged yet.</Text>
              )}
            </View>

            {/* Transition Action */}
            <Button
              label="Generate Itemized Bill"
              onPress={() => setStep('itemized')}
              variant="primary"
              style={styles.generateBtn}
            />

          </View>
        ) : (
          /* ─── STEP 2: ITEMIZED BILL SCREEN ──────────────────────────────── */
          <View style={styles.stepContainer}>
            {/* Step back button if invoice not yet saved */}
            {!invoice?.id && (
              <AppPressable style={styles.backToReviewBtn} onPress={() => setStep('review')}>
                <ArrowLeft size={14} color={colors.primary} />
                <Text style={styles.backToReviewText}>Back to Review</Text>
              </AppPressable>
            )}

            {/* 1. Itemized Table (Editable Price & 18% default Tax %) */}
            <ItemizedBillTable
              items={itemizedLines}
              deviceSerialNumber={job.serial_number}
              editable={true}
              onUpdateItem={handleUpdateLine}
            />

            {/* 2. Totals Card (Subtotal → Tax Amount → Total) */}
            <ItemizedBillTotals
              subtotal={subtotal}
              totalTax={totalTax}
              grandTotal={grandTotal}
              editable={true}
              onUpdateGrandTotal={handleUpdateGrandTotal}
            />

            {/* 3. Unified Payment Recording Section */}
            <PaymentRecordingBox
              invoiceId={invoice?.id}
              grandTotal={invoice?.grand_total ?? grandTotal}
              amountPaid={invoice?.amount_paid ?? 0}
              paymentMethod={invoice?.payment_method || 'Cash'}
              status={invoice?.status}
              onPaymentRecorded={(data) => {
                setInvoice((prev: any) => ({
                  ...(prev || {}),
                  id: data.invoice_id || invoice?.id,
                  amount_paid: data.amount_paid,
                  status: data.status,
                  paid_at: data.paid_at,
                  payment_method: data.payment_method,
                  grand_total: data.grand_total,
                }));
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Footer Actions (Step 2 Only) */}
      {step === 'itemized' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}>
          <View style={styles.secondaryActions}>
            <AppPressable style={styles.secondaryBtn} onPress={handlePrint}>
              <Printer size={18} color={colors.textPrimary} />
            </AppPressable>
            <AppPressable style={styles.secondaryBtn} onPress={handleWhatsApp}>
              <MessageCircle size={18} color={colors.textPrimary} />
            </AppPressable>
            <AppPressable style={styles.secondaryBtn} onPress={handleEmail}>
              <Mail size={18} color={colors.textPrimary} />
            </AppPressable>
          </View>
          <Button
            label={invoice?.id ? 'Update Bill' : 'Save Bill'}
            onPress={handleSaveBill}
            loading={saving}
            disabled={saving}
            variant="primary"
            style={styles.primaryBtn}
          />
        </View>
      )}
    </View>
  );
}

function roundMoney(val: number): number {
  return Math.round(val * 100) / 100;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  header: { alignItems: 'center', marginBottom: spacing.lg, paddingVertical: spacing.sm },
  jobCode: { ...typography.h1, color: colors.textPrimary, marginBottom: 2 },
  customerText: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xs },
  badgeRow: { flexDirection: 'row', gap: spacing.sm },
  stepContainer: { width: '100%' },
  reviewSerialBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF',
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFE',
    marginBottom: spacing.md, gap: spacing.xs,
  },
  reviewSerialText: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  reviewCard: {
    backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: spacing.xl, ...shadow.card,
  },
  reviewCardTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  reviewItemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  reviewItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, marginRight: spacing.sm },
  reviewItemName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  reviewItemPrice: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  emptyMaterialsText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', paddingVertical: spacing.sm },
  generateBtn: { width: '100%', height: 50, borderRadius: radius.md },
  backToReviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md,
    alignSelf: 'flex-start', paddingVertical: 4,
  },
  backToReviewText: { fontSize: 13, fontWeight: '700', color: colors.primary },
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
