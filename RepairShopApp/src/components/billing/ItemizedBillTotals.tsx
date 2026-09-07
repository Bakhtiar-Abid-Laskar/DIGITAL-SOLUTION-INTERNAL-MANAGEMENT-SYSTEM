import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { formatCurrency } from '@repairshop/shared';
import { colors, radius, spacing, typography, shadow } from '../../tokens';

interface ItemizedBillTotalsProps {
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  editable?: boolean;
  onUpdateGrandTotal?: (newTotal: number) => void;
}

export default function ItemizedBillTotals({
  subtotal,
  totalTax,
  grandTotal,
  editable = false,
  onUpdateGrandTotal,
}: ItemizedBillTotalsProps) {
  const [grandTotalInput, setGrandTotalInput] = useState<string | null>(null);

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
        {editable && onUpdateGrandTotal ? (
          <View style={styles.totalInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.totalInput}
              keyboardType="numeric"
              value={
                grandTotalInput !== null
                  ? grandTotalInput
                  : grandTotal
                  ? grandTotal.toFixed(2)
                  : '0.00'
              }
              onChangeText={(text) => {
                setGrandTotalInput(text);
                const parsed = parseFloat(text);
                if (!isNaN(parsed) && parsed >= 0) {
                  onUpdateGrandTotal(parsed);
                }
              }}
              onBlur={() => {
                if (grandTotalInput !== null) {
                  const parsed = parseFloat(grandTotalInput);
                  if (!isNaN(parsed) && parsed >= 0) {
                    onUpdateGrandTotal(parsed);
                  }
                  setGrandTotalInput(null);
                }
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        ) : (
          <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
        )}
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
  totalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 120,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 4,
  },
  totalInput: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'right',
    minWidth: 90,
    paddingVertical: 2,
  },
});
