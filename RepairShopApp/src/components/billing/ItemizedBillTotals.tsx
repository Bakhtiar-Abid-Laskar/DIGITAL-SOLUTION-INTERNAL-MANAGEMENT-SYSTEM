import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '@repairshop/shared';
import { colors, radius, spacing, typography, shadow } from '../../tokens';

interface ItemizedBillTotalsProps {
  subtotal: number;
  totalTax: number;
  grandTotal: number;
}

export default function ItemizedBillTotals({
  subtotal,
  totalTax,
  grandTotal,
}: ItemizedBillTotalsProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Bill Totals</Text>

      {/* Subtotal */}
      <View style={styles.row}>
        <Text style={styles.label}>Subtotal (Pre-Tax)</Text>
        <Text style={styles.value}>{formatCurrency(subtotal)}</Text>
      </View>

      {/* Tax Amount */}
      <View style={styles.row}>
        <Text style={styles.label}>Total Tax (Per-Line Computed)</Text>
        <Text style={styles.value}>{formatCurrency(totalTax)}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Grand Total */}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.card,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.sm,
  },
  totalRow: {
    marginBottom: 0,
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
