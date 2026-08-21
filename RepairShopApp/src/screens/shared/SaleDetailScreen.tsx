import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/common/AppHeader';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { formatCurrency, formatDate } from '@repairshop/shared';
import ErrorState from '../../components/common/ErrorState';

export default function SaleDetailScreen() {
  const route = useRoute<any>();
  const invoiceId = route.params?.invoiceId;

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
  const balanceDue = Number(invoice.grand_total) - Number(invoice.amount_paid);

  return (
    <View style={styles.container}>
      <AppHeader title={isJob ? 'Job Invoice' : 'Sale Invoice'} showBack={true} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header section */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.codeText}>{invoice.invoice_code}</Text>
            <View style={[styles.badge, invoice.status === 'paid' ? styles.badgeSuccess : invoice.status === 'cancelled' ? styles.badgeDanger : styles.badgeWarning]}>
              <Text style={[styles.badgeText, invoice.status === 'paid' ? styles.badgeTextSuccess : invoice.status === 'cancelled' ? styles.badgeTextDanger : styles.badgeTextWarning]}>
                {(invoice.status || '').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>{formatDate(invoice.created_at)}</Text>
          <View style={styles.badgeRegime}>
            <Text style={styles.badgeRegimeText}>{invoice.tax_regime === 'inter_state' ? 'IGST' : 'CGST+SGST'}</Text>
          </View>
        </View>

        {/* Customer section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Name:</Text><Text style={styles.infoValue}>{invoice.customer_name}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Contact:</Text><Text style={styles.infoValue}>{invoice.customer_contact || '—'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Email:</Text><Text style={styles.infoValue}>{invoice.customer_email || '—'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>GSTIN:</Text><Text style={styles.infoValue}>{invoice.customer_gstin || '—'}</Text></View>
        </View>

        {/* Line Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {items.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <Text style={styles.itemTotal}>{formatCurrency(item.line_total)}</Text>
              </View>
              <Text style={styles.itemSubtext}>
                {item.quantity} x {formatCurrency(item.selling_rate)}
                {item.serial_number ? ` (SN: ${item.serial_number})` : ''}
              </Text>
              <Text style={styles.itemTaxText}>
                Tax: {formatCurrency(Number(item.cgst_amount) + Number(item.sgst_amount) + Number(item.igst_amount))} 
                {invoice.tax_regime === 'inter_state' 
                  ? ` (IGST ${item.igst_rate}%)` 
                  : ` (CGST ${item.cgst_rate}% + SGST ${item.sgst_rate}%)`}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Totals</Text>
          <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Subtotal</Text><Text style={styles.totalsValue}>{formatCurrency(invoice.subtotal)}</Text></View>
          <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Tax</Text><Text style={styles.totalsValue}>{formatCurrency(invoice.total_tax)}</Text></View>
          <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Discount</Text><Text style={styles.totalsValue}>- {formatCurrency(invoice.discount)}</Text></View>
          <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Round Off</Text><Text style={styles.totalsValue}>{formatCurrency(invoice.round_off)}</Text></View>
          <View style={[styles.totalsRow, styles.grandTotalRow]}><Text style={styles.grandTotalLabel}>Grand Total</Text><Text style={styles.grandTotalValue}>{formatCurrency(invoice.grand_total)}</Text></View>
        </View>

        {/* Payment Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Status</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Payment Method:</Text><Text style={styles.infoValue}>{invoice.payment_method || '—'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Amount Paid:</Text><Text style={[styles.infoValue, { color: colors.success }]}>{formatCurrency(invoice.amount_paid)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Balance Due:</Text><Text style={[styles.infoValue, { color: balanceDue > 0 ? colors.accentRed : colors.textPrimary, fontWeight: 'bold' }]}>{formatCurrency(balanceDue)}</Text></View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
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
});
