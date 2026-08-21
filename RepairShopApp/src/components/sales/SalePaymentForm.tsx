import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { colors, radius, spacing, typography } from '../../tokens';

type SaleStatus = 'Draft' | 'Paid' | 'Cancelled';
type SalePaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other';

type FormState = {
  status: SaleStatus;
  payment_method: SalePaymentMethod;
  discount: string;
  tax_percent: string;
  notes: string;
};

type ConfigOption = { id: string; label?: string };

interface Props {
  form: FormState;
  errors: Record<string, string>;
  saleStatuses: ConfigOption[];
  paymentMethods: ConfigOption[];
  subtotal: number;
  discountValue: number;
  taxPercent: number;
  totalTax: number;
  totalAmount: number;
  onChange: (updates: Partial<FormState>) => void;
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function SalePaymentForm({
  form, errors, saleStatuses, paymentMethods,
  subtotal, discountValue, taxPercent, totalTax, totalAmount, onChange,
}: Props) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.choiceRow}>
            {saleStatuses.map((s) => (
              <AppPressable
                key={s.id}
                style={[styles.choiceChip, form.status === s.id && styles.choiceChipActive]}
                onPress={() => onChange({ status: s.id as SaleStatus })}
              >
                <Text style={[styles.choiceChipText, form.status === s.id && styles.choiceChipTextActive]}>{s.id}</Text>
              </AppPressable>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Payment Method</Text>
          <View style={styles.choiceRow}>
            {paymentMethods.map((m) => (
              <AppPressable
                key={m.id}
                style={[styles.choiceChip, form.payment_method === m.id && styles.choiceChipActive]}
                onPress={() => onChange({ payment_method: m.id as SalePaymentMethod })}
              >
                <Text style={[styles.choiceChipText, form.payment_method === m.id && styles.choiceChipTextActive]}>{m.id}</Text>
              </AppPressable>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Discount</Text>
          <TextInput
            style={styles.input} placeholder="0.00" placeholderTextColor={colors.textMuted}
            keyboardType="numeric" value={form.discount}
            onChangeText={value => onChange({ discount: value })}
          />
          {errors.discount ? <Text style={styles.errorText}>{errors.discount}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Tax Percent (For Custom Items)</Text>
          <TextInput
            style={styles.input} placeholder="0" placeholderTextColor={colors.textMuted}
            keyboardType="numeric" value={form.tax_percent}
            onChangeText={value => onChange({ tax_percent: value })}
          />
          {errors.tax_percent ? <Text style={styles.errorText}>{errors.tax_percent}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]} placeholder="Optional notes"
            placeholderTextColor={colors.textMuted} multiline
            value={form.notes} onChangeText={value => onChange({ notes: value })}
          />
        </View>
      </View>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{currency.format(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Discount</Text>
          <Text style={styles.summaryValue}>{currency.format(discountValue)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>{taxPercent}% ({currency.format(totalTax)})</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>{currency.format(totalAmount)}</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg, backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 16,
    color: colors.textPrimary, backgroundColor: colors.backgroundAlt,
  },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  errorText: { ...typography.caption, color: colors.accentRed, marginTop: spacing.xs },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choiceChip: {
    minHeight: 40, borderRadius: radius.pill, paddingHorizontal: spacing.md,
    justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundAlt,
  },
  choiceChipActive: { backgroundColor: colors.navBackground, borderColor: colors.navBackground },
  choiceChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  choiceChipTextActive: { color: colors.textInverse },
  summaryCard: {
    marginHorizontal: spacing.lg, backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  summaryLabel: { ...typography.body, color: colors.textSecondary },
  summaryValue: { ...typography.bodyBold, color: colors.textPrimary },
  summaryTotalRow: { marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 0 },
  summaryTotalLabel: { ...typography.h3, color: colors.textPrimary },
  summaryTotalValue: { ...typography.h3, color: colors.textPrimary },
});
