import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { MonitorSmartphone, Battery, HardDrive, Cpu, PackageOpen, AlertCircle, Edit2, Trash2 } from 'lucide-react-native';
import { colors, radius, spacing, shadow, typography } from '../../tokens';

export type InventoryItem = {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  cost_price: number;
  selling_rate?: number;
  location?: string;
  minimum_stock_level?: number;
  low_stock_threshold: number;
  last_updated: string;
  product_id?: string;
  products?: {
    name: string;
    sku: string;
    unit: string;
    hsn_sac: string;
    tax_mode: string;
    cgst_rate: number;
    sgst_rate: number;
    igst_rate: number;
  };
};

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('screen') || lower.includes('display')) return <MonitorSmartphone size={24} color={colors.accentBlue} />;
  if (lower.includes('battery')) return <Battery size={24} color={colors.accentGreen} />;
  if (lower.includes('drive') || lower.includes('ssd') || lower.includes('hdd')) return <HardDrive size={24} color={colors.accentLightPurple} />;
  if (lower.includes('board') || lower.includes('chip') || lower.includes('ram')) return <Cpu size={24} color={colors.accentOrange} />;
  return <PackageOpen size={24} color={colors.textSecondary} />;
}

interface Props {
  item: InventoryItem;
  isAdmin: boolean;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export const InventoryRow = React.memo(({ item, isAdmin, onEdit, onDelete }: Props) => {
  const isOutOfStock = item.quantity <= 0;
  const isLowStock   = !isOutOfStock && item.quantity <= item.low_stock_threshold;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIconBox}>{getCategoryIcon(item.item_name)}</View>
        <View style={styles.itemTitleContainer}>
          <Text style={styles.itemName}>{item.item_name}</Text>
          <Text style={styles.itemUnit}>Cost: ₹{item.cost_price} / {item.unit}</Text>
        </View>
        <View style={styles.itemActions}>
          {isAdmin && (
            <>
              <AppPressable style={styles.actionBtn} onPress={() => onEdit(item)}>
                <Edit2 size={18} color={colors.textSecondary} />
              </AppPressable>
              <AppPressable style={styles.actionBtn} onPress={() => onDelete(item.id)}>
                <Trash2 size={18} color={colors.accentRed} />
              </AppPressable>
            </>
          )}
        </View>
      </View>

      <View style={styles.itemStats}>
        <View style={[styles.statBadge, isOutOfStock ? styles.statBadgeDanger : isLowStock ? styles.statBadgeWarning : styles.statBadgeSuccess]}>
          <Text style={[styles.statValue, isOutOfStock ? styles.statTextDanger : isLowStock ? styles.statTextWarning : styles.statTextSuccess]}>
            {item.quantity} {item.unit}
          </Text>
          <Text style={[styles.statLabel, isOutOfStock ? styles.statTextDanger : isLowStock ? styles.statTextWarning : styles.statTextSuccess]}>
            In Stock
          </Text>
        </View>
        {(isLowStock || isOutOfStock) && (
          <View style={styles.alertRow}>
            <AlertCircle size={14} color={isOutOfStock ? colors.accentRed : colors.accentOrange} />
            <Text style={[styles.alertText, { color: isOutOfStock ? colors.accentRed : colors.accentOrange }]}>
              {isOutOfStock ? 'Out of stock' : `Low stock (Threshold: ${item.low_stock_threshold})`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  itemCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, ...(shadow as any).sm,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  itemIconBox: {
    width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  itemTitleContainer: { flex: 1 },
  itemName: { ...typography.bodyBold, color: colors.textPrimary, marginBottom: 2 },
  itemUnit: { ...typography.caption, color: colors.textSecondary },
  itemActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
  itemStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: colors.border,
  },
  statBadge: {
    flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    borderRadius: radius.sm, backgroundColor: colors.backgroundAlt,
  },
  statBadgeSuccess: { backgroundColor: colors.statusCompletedBg },
  statBadgeWarning: { backgroundColor: colors.statusWaitingBg },
  statBadgeDanger:  { backgroundColor: colors.statusUrgentBg },
  statValue: { ...typography.h3, fontSize: 18, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  statTextSuccess: { color: colors.statusCompletedFg },
  statTextWarning: { color: colors.statusWaitingFg },
  statTextDanger:  { color: colors.statusUrgentFg },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  alertText: { ...typography.caption, fontWeight: '600' },
});
