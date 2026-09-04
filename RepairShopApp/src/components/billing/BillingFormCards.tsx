import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { formatCurrency } from '@repairshop/shared';
import SectionLabel from '../common/SectionLabel';
import { colors, radius, spacing, typography, shadow } from '../../tokens';

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
          <Text style={styles.inputLabel}>Labour / Service Charge (₹)</Text>
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
}

export function BillingTotalsCard({
  subTotal, taxAmount, taxPercent, discount, grandTotal,
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.card,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: '#F8FAFC',
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  grandTotalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.sm,
  },
  grandTotalLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
