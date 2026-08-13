import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { Trash2 } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

export interface LineItem {
  id: string;
  name: string;
  qty: number;
  cost: number;
}

interface LineItemTableProps {
  items: LineItem[];
  editable?: boolean;
  onUpdateQty?: (id: string, qty: number) => void;
  onUpdateCost?: (id: string, cost: number) => void;
  onRemoveItem?: (id: string) => void;
  onAddItem?: () => void;
}

export default function LineItemTable({
  items,
  editable = false,
  onUpdateQty,
  onUpdateCost,
  onRemoveItem,
  onAddItem,
}: LineItemTableProps) {
  const totalCost = items.reduce((sum, item) => sum + (item.qty * item.cost), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { flex: 2 }]}>Item</Text>
        <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
        <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>Cost (₹)</Text>
        {editable && <View style={styles.actionCell} />}
      </View>

      {/* Rows */}
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={[styles.cell, { flex: 2 }]} numberOfLines={2}>{item.name}</Text>
          
          {editable ? (
            <TextInput
              style={[styles.input, { flex: 1, textAlign: 'center' }]}
              value={item.qty.toString()}
              onChangeText={(val) => onUpdateQty && onUpdateQty(item.id, parseInt(val) || 0)}
              keyboardType="numeric"
            />
          ) : (
            <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{item.qty}</Text>
          )}

          {editable ? (
            <TextInput
              style={[styles.input, { flex: 1, textAlign: 'right' }]}
              value={item.cost.toString()}
              onChangeText={(val) => onUpdateCost && onUpdateCost(item.id, parseInt(val) || 0)}
              keyboardType="numeric"
            />
          ) : (
            <Text style={[styles.cell, { flex: 1, textAlign: 'right' }]}>{item.cost}</Text>
          )}

          {editable && (
            <AppPressable style={styles.actionCell} onPress={() => onRemoveItem && onRemoveItem(item.id)}>
              <Trash2 size={16} color={colors.error} />
            </AppPressable>
          )}
        </View>
      ))}

      {/* Add Item Button */}
      {editable && onAddItem && (
        <AppPressable style={styles.addRow} onPress={onAddItem}>
          <Text style={styles.addText}>+ Add Item</Text>
        </AppPressable>
      )}

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Cost</Text>
        <Text style={styles.totalValue}>₹{totalCost}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cell: {
    ...typography.body,
    color: colors.textPrimary,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundAlt,
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 2,
  },
  actionCell: {
    width: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addRow: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  addText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundAlt,
  },
  totalLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
});
