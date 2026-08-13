import React from 'react';
import { View, Text, StyleSheet, TextInput, Switch } from 'react-native';
import { formatCurrency } from '@repairshop/shared';
import SectionLabel from '../common/SectionLabel';
import { colors, radius, spacing, typography } from '../../tokens';

interface AdjustmentsProps {
  labourStr: string;
  taxStr: string;
  discountStr: string;
  onChangeLabour: (v: string) => void;
  onChangeTax: (v: string) => void;
  onChangeDiscount: (v: string) => void;
}

export function BillingAdjustmentsForm({
  labourStr, taxStr, discountStr,
  onChangeLabour, onChangeTax, onChangeDiscount,
}: AdjustmentsProps) {
  return (
    <>
      <SectionLabel title="ADJUSTMENTS" />
      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Labour Charge (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={labourStr}
            onChangeText={onChangeLabour}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tax Percent (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={taxStr}
            onChangeText={onChangeTax}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Discount (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={discountStr}
            onChangeText={onChangeDiscount}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>
    </>
  );
}

interface TotalsProps {
  subTotal: number;
  taxAmount: number;
  taxPercent: number;
  discount: number;
  grandTotal: number;
  isPaid: boolean;
  isNoCharge: boolean;
  isBlocked: boolean;
  onTogglePaid: (v: boolean) => void;
  onToggleNoCharge: (v: boolean) => void;
}

export function BillingTotalsCard({
  subTotal, taxAmount, taxPercent, discount, grandTotal,
  isPaid, isNoCharge, isBlocked, onTogglePaid, onToggleNoCharge,
}: TotalsProps) {
  return (
    <>
      <SectionLabel title="TOTALS" />
      <View style={styles.card}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Sub Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(subTotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax Amount ({taxPercent}%)</Text>
          <Text style={styles.totalValue}>{formatCurrency(taxAmount)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Discount</Text>
          <Text style={[styles.totalValue, { color: colors.error }]}>- {formatCurrency(discount)}</Text>
        </View>

        <View style={styles.grandTotalDivider} />

        <View style={styles.totalRow}>
          <Text style={styles.grandTotalLabel}>TOTAL</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
        </View>

        {isBlocked && (
          <Text style={styles.zeroTotalWarningText}>
            Total is ₹0. Save is blocked unless marked as no-charge warranty.
          </Text>
        )}

        <View style={styles.paidToggleContainer}>
          <Text style={styles.paidToggleLabel}>No-charge warranty</Text>
          <Switch
            value={isNoCharge}
            onValueChange={onToggleNoCharge}
            trackColor={{ false: colors.border, true: colors.warning }}
            thumbColor={isNoCharge ? colors.warning : colors.textInverse}
          />
        </View>
        <View style={styles.paidToggleContainer}>
          <Text style={styles.paidToggleLabel}>Mark as Paid</Text>
          <Switch
            value={isPaid}
            onValueChange={onTogglePaid}
            trackColor={{ false: colors.border, true: colors.success }}
            thumbColor={isPaid ? colors.success : colors.textInverse}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.backgroundAlt,
    color: colors.textPrimary,
    ...typography.body,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  totalLabel: { ...typography.body, color: colors.textSecondary },
  totalValue: { ...typography.bodyBold, color: colors.textPrimary },
  grandTotalDivider: { height: 1.5, backgroundColor: colors.border, marginVertical: spacing.md },
  grandTotalLabel: { ...typography.h3, color: colors.textPrimary },
  grandTotalValue: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  zeroTotalWarningText: { ...typography.caption, color: colors.error, marginTop: spacing.sm, textAlign: 'center' },
  paidToggleContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  paidToggleLabel: { ...typography.bodyBold, color: colors.textPrimary },
});
