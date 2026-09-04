import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/common/AppHeader';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { formatCurrency, formatDate, createWhatsAppUrl } from '@repairshop/shared';
import ErrorState from '../../components/common/ErrorState';
import PaymentRecordingBox from '../../components/billing/PaymentRecordingBox';
import ItemizedBillTable from '../../components/billing/ItemizedBillTable';
import ItemizedBillTotals from '../../components/billing/ItemizedBillTotals';
import { AppPressable } from '../../components/common/AppPressable';
import SectionLabel from '../../components/common/SectionLabel';
import DetailRow from '../../components/common/DetailRow';
import StatusBadge from '../../components/jobs/StatusBadge';
import { Printer, MessageCircle } from 'lucide-react-native';
import { useToast } from '../../context/ToastContext';
import { usePdfGenerator } from '../../context/PdfProgressContext';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';


export default function SaleDetailScreen() {
  const route = useRoute<any>();
  const invoiceId = route.params?.invoiceId;
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav_actions');
  const { showToast } = useToast();
  const { generatePdf } = usePdfGenerator();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          created_by_user:users!invoices_created_by_fkey(name),
          invoice_items(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (fetchError) throw fetchError;

      setInvoice(data);
      setItems(data.invoice_items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (invoiceId) fetchDetail();
    }, [invoiceId])
  );

  const handlePrint = async () => {
    if (!invoice) return;
    await generatePdf({
      request: { docType: 'final', invoiceId: invoice.id },
      title: 'Generating Sale Invoice',
      mode: 'print',
    });
  };

  const handleWhatsApp = async () => {
    if (!invoice) return;
    const msg = `Hello ${invoice.customer_name || 'Customer'}, your Digital Solution invoice ${invoice.invoice_code} is ready.\n\nGrand Total: ₹${Number(invoice.grand_total || 0).toFixed(2)}\nAmount Paid: ₹${Number(invoice.amount_paid || 0).toFixed(2)}\nBalance Due: ₹${Math.max(0, Number(invoice.grand_total || 0) - Number(invoice.amount_paid || 0)).toFixed(2)}\n\nThank you for choosing Digital Solution.`;
    const url = createWhatsAppUrl(invoice.customer_contact || '', msg);
    if (!url) {
      showToast({ title: 'Error', message: 'No valid phone number for WhatsApp.', type: 'error' });
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        showToast({ title: 'Error', message: 'WhatsApp is not installed.', type: 'error' });
        return;
      }
      await Linking.openURL(url);
    } catch {
      showToast({ title: 'Error', message: 'Could not open WhatsApp.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Details" showBack={true} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <View style={styles.container}>
        <AppHeader title="Details" showBack={true} />
        <ErrorState message={error || 'Invoice not found'} onRetry={fetchDetail} />
      </View>
    );
  }

  const isJob = !!invoice.job_id;

  return (
    <View style={styles.container}>
      <AppHeader title={isJob ? 'Job Invoice' : 'Sale Invoice'} showBack={true} />
      
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 80 }]}>
        {/* Header section */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.codeText}>{invoice.invoice_code}</Text>
            <StatusBadge status={invoice.status === 'paid' ? 'Completed' : (invoice.status === 'cancelled' ? 'Urgent' : 'Waiting')} />
          </View>
          <Text style={styles.dateText}>{formatDate(invoice.created_at)}</Text>
          <View style={styles.badgeRegime}>
            <Text style={styles.badgeRegimeText}>{invoice.tax_regime === 'inter_state' ? 'IGST' : 'CGST+SGST'}</Text>
          </View>
        </View>

        {/* Customer section */}
        <SectionLabel title="CUSTOMER INFORMATION" />
        <View style={styles.card}>
          <DetailRow label="Name" value={invoice.customer_name} showDivider />
          <DetailRow label="Contact" value={invoice.customer_contact || '—'} showDivider />
          <DetailRow label="Email" value={invoice.customer_email || '—'} showDivider />
          <DetailRow label="GSTIN" value={invoice.customer_gstin || '—'} />
        </View>

        {/* Line Items & Charges */}
        <ItemizedBillTable
          items={items.map((it: any) => ({
            id: it.id,
            item_name: it.item_name,
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.selling_rate) || 0,
            tax_percent: it.tax_percent !== undefined ? Number(it.tax_percent) : Number(it.cgst_rate || 0) + Number(it.sgst_rate || 0) || 18,
            hsn_code: it.hsn_code || null,
            serial_number: it.serial_number || null,
            is_labour: it.item_name === 'Labour Charge' || it.item_name === 'Service Charge',
          }))}
          editable={false}
        />

        {/* Totals Section */}
        <ItemizedBillTotals
          subtotal={Number(invoice.subtotal) || 0}
          totalTax={Number(invoice.total_tax) || 0}
          grandTotal={Number(invoice.grand_total) || 0}
        />


        {/* Payment Recording Section */}
        <PaymentRecordingBox
          invoiceId={invoice.id}
          grandTotal={Number(invoice.grand_total) || 0}
          amountPaid={Number(invoice.amount_paid) || 0}
          paymentMethod={invoice.payment_method || 'Cash'}
          status={invoice.status}
          onPaymentRecorded={(data) => {
            setInvoice((prev: any) => ({
              ...prev,
              amount_paid: data.amount_paid,
              status: data.status,
              paid_at: data.paid_at,
              payment_method: data.payment_method,
              grand_total: data.grand_total,
            }));
          }}
        />
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}>
        <AppPressable style={styles.actionBtn} onPress={handlePrint}>
          <Printer size={18} color={colors.textPrimary} />
          <Text style={styles.actionBtnText}>Print</Text>
        </AppPressable>
        <AppPressable style={styles.actionBtn} onPress={handleWhatsApp}>
          <MessageCircle size={18} color={colors.textPrimary} />
          <Text style={styles.actionBtnText}>WhatsApp</Text>
        </AppPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.card },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  codeText: { ...typography.h2, color: colors.textPrimary },
  dateText: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  infoLabel: { ...typography.body, color: colors.textSecondary },
  infoValue: { ...typography.bodyBold, color: colors.textPrimary },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill },
  badgeSuccess: { backgroundColor: colors.success + '20' },
  badgeWarning: { backgroundColor: colors.warning + '20' },
  badgeDanger: { backgroundColor: colors.error + '20' },
  badgeText: { ...typography.caption, fontWeight: 'bold' },
  badgeTextSuccess: { color: colors.success },
  badgeTextWarning: { color: '#B27600' },
  badgeTextDanger: { color: colors.error },
  badgeRegime: { alignSelf: 'flex-start', backgroundColor: colors.backgroundAlt, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  badgeRegimeText: { ...typography.caption, color: colors.textSecondary },
  itemRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm, marginBottom: spacing.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  itemName: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  itemTotal: { ...typography.bodyBold, color: colors.textPrimary },
  itemSubtext: { ...typography.caption, color: colors.textSecondary },
  itemTaxText: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  totalsLabel: { ...typography.body, color: colors.textSecondary },
  totalsValue: { ...typography.body, color: colors.textPrimary },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  grandTotalLabel: { ...typography.h3, color: colors.textPrimary },
  grandTotalValue: { ...typography.h2, color: colors.textPrimary },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: spacing.md,
    backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, ...shadow.nav,
  },
  actionBtn: {
    flex: 1, height: 48, backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, flexDirection: 'row', gap: spacing.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnText: { ...typography.bodyBold, color: colors.textPrimary },

});
