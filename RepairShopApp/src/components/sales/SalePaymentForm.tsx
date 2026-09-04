import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { formatCurrency, validatePaymentAmount, derivePaymentStatus } from '@repairshop/shared';
import { CreditCard, AlertCircle } from 'lucide-react-native';

export type SaleStatus = 'draft' | 'paid' | 'cancelled' | 'partial' | 'unpaid' | 'pending';
export type SalePaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other';

export type FormState = {
  status: SaleStatus;
  payment_method: SalePaymentMethod;
  amount_paid: string;
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

export function SalePaymentForm({
  form, errors, saleStatuses, paymentMethods,
  subtotal, discountValue, taxPercent, totalTax, totalAmount, onChange,
}: Props) {
  const enteredAmount = form.amount_paid !== '' ? parseFloat(form.amount_paid) || 0 : (form.status === 'paid' ? totalAmount : 0);
  const derivedStatus = derivePaymentStatus(enteredAmount, totalAmount);
  const balanceDue = Math.max(0, totalAmount - enteredAmount);

  const handleAmountChange = (val: string) => {
    onChange({ amount_paid: val });
  };

  const handleSetFull = () => {
    onChange({ amount_paid: String(totalAmount), status: 'paid' });
  };

  const validation = validatePaymentAmount(enteredAmount, totalAmount);
  const isInvalid = !validation.isValid && form.amount_paid !== '';

  const badgeStyles =
    derivedStatus === 'paid'
      ? { bg: '#DCFCE7', fg: '#15803D', border: '#BBF7D0' }
      : derivedStatus === 'partial'
      ? { bg: '#FEF3C7', fg: '#B45309', border: '#FDE68A' }
      : { bg: '#FEE2E2', fg: '#B91C1C', border: '#FECACA' };

  return (
    <>
      {/* Payment Container Box */}
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <CreditCard size={18} color={colors.primary} />
            <Text style={styles.headerTitle}>Payment Recording</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeStyles.bg, borderColor: badgeStyles.border }]}>
            <Text style={[styles.statusBadgeText, { color: badgeStyles.fg }]}>
              {derivedStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Bill Amount Display (Read-Only Container) */}
        <View style={styles.totalDisplayBox}>
          <Text style={styles.totalDisplayLabel}>TOTAL BILL AMOUNT</Text>
          <Text style={styles.totalDisplayValue}>{formatCurrency(totalAmount)}</Text>
        </View>

        {/* Payment Method Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Payment Method</Text>
          <View style={styles.methodRow}>
            {paymentMethods.map((m) => {
              const isSelected = form.payment_method === m.id;
              return (
                <AppPressable
                  key={m.id}
                  style={[styles.methodChip, isSelected && styles.methodChipSelected]}
                  onPress={() => onChange({ payment_method: m.id as SalePaymentMethod })}
                >
                  <Text style={[styles.methodChipText, isSelected && styles.methodChipTextSelected]}>
                    {m.id}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        </View>

        {/* Amount Paid Field */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Amount Received (₹)</Text>
            {enteredAmount < totalAmount && (
              <AppPressable onPress={handleSetFull}>
                <Text style={styles.payFullLink}>Pay Full ({formatCurrency(totalAmount)})</Text>
              </AppPressable>
            )}
          </View>
          <TextInput
            style={[styles.input, isInvalid && styles.inputError]}
            placeholder={form.status === 'paid' ? String(totalAmount) : "0.00"}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={form.amount_paid}
            onChangeText={handleAmountChange}
          />
          {isInvalid && (
            <View style={styles.errorRow}>
              <AlertCircle size={14} color={colors.error} />
              <Text style={styles.errorText}>{validation.error}</Text>
            </View>
          )}
        </View>

        {/* Discount Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Discount (₹)</Text>
          <TextInput
            style={styles.input} placeholder="0.00" placeholderTextColor={colors.textMuted}
            keyboardType="numeric" value={form.discount}
            onChangeText={value => onChange({ discount: value })}
          />
          {errors.discount ? <Text style={styles.errorText}>{errors.discount}</Text> : null}
        </View>

        {/* Tax Percent for custom items */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Tax Percent (%) (For Custom Items)</Text>
          <TextInput
            style={styles.input} placeholder="0" placeholderTextColor={colors.textMuted}
            keyboardType="numeric" value={form.tax_percent}
            onChangeText={value => onChange({ tax_percent: value })}
          />
          {errors.tax_percent ? <Text style={styles.errorText}>{errors.tax_percent}</Text> : null}
        </View>

        {/* Notes */}
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
          <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Discount</Text>
          <Text style={[styles.summaryValue, { color: colors.error }]}>- {formatCurrency(discountValue)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax ({taxPercent}%)</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalTax)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={styles.summaryTotalLabel}>Grand Total</Text>
          <Text style={styles.summaryTotalValue}>{formatCurrency(totalAmount)}</Text>
        </View>
        <View style={styles.balanceSummaryRow}>
          <Text style={styles.summaryLabel}>Balance Due:</Text>
          <Text style={[styles.summaryValue, { color: balanceDue > 0 ? colors.error : colors.success, fontWeight: '700' }]}>
            {formatCurrency(balanceDue)} ({derivedStatus.toUpperCase()})
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  totalDisplayBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalDisplayLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  totalDisplayValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  payFullLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: colors.textPrimary,
    ...typography.bodyBold,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 46,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  methodChip: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  methodChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  methodChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  methodChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryTotalRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginBottom: spacing.xs,
  },
  summaryTotalLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  balanceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
});
