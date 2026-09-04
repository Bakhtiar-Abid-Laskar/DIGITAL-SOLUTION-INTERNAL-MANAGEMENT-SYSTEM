import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { formatCurrency } from '@repairshop/shared';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { Package, Wrench, Tag, Hash, Trash2, Plus } from 'lucide-react-native';

export interface ItemizedLineItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;      // Editable selling price
  tax_percent: number;     // Editable tax percentage (default 18)
  hsn_code?: string | null;
  serial_number?: string | null;
  is_labour?: boolean;
  product_id?: string | null;
}

interface ItemizedBillTableProps {
  items: ItemizedLineItem[];
  deviceSerialNumber?: string | null;
  editable?: boolean;
  canRemoveItems?: boolean;
  onUpdateItem?: (id: string, updates: Partial<ItemizedLineItem>) => void;
  onRemoveItem?: (id: string) => void;
  onAddItem?: () => void;
}

export default function ItemizedBillTable({
  items,
  deviceSerialNumber,
  editable = true,
  canRemoveItems = false,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}: ItemizedBillTableProps) {
  const handlePriceChange = (id: string, text: string) => {
    const parsed = parseFloat(text);
    onUpdateItem?.(id, { unit_price: isNaN(parsed) || parsed < 0 ? 0 : parsed });
  };

  const handleTaxChange = (id: string, text: string) => {
    const parsed = parseFloat(text);
    onUpdateItem?.(id, { tax_percent: isNaN(parsed) || parsed < 0 ? 0 : parsed });
  };

  const handleQtyChange = (id: string, text: string) => {
    const parsed = parseFloat(text);
    onUpdateItem?.(id, { quantity: isNaN(parsed) || parsed <= 0 ? 1 : parsed });
  };

  return (
    <View style={styles.container}>
      {/* Device Serial Number Header Banner (if applicable for Job) */}
      {deviceSerialNumber ? (
        <View style={styles.deviceSerialBanner}>
          <Hash size={14} color={colors.primary} />
          <Text style={styles.deviceSerialLabel}>Device S/N:</Text>
          <Text style={styles.deviceSerialValue}>{deviceSerialNumber}</Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Itemized Charges</Text>
        {onAddItem && (
          <AppPressable style={styles.addBtn} onPress={onAddItem}>
            <Plus size={14} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </AppPressable>
        )}
      </View>

      {/* Line Items List */}
      {items.map((item, index) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;
        const taxRate = item.tax_percent !== undefined ? Number(item.tax_percent) : 18;
        const lineSubtotal = qty * price;
        const lineTaxAmount = lineSubtotal * (taxRate / 100);
        const lineTotal = lineSubtotal + lineTaxAmount;

        return (
          <View key={item.id || index} style={styles.itemCard}>
            {/* Top row: Item Name & Badges */}
            <View style={styles.itemHeaderRow}>
              <View style={styles.nameContainer}>
                {item.is_labour ? (
                  <Wrench size={16} color={colors.primary} style={styles.typeIcon} />
                ) : (
                  <Package size={16} color={colors.textSecondary} style={styles.typeIcon} />
                )}
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.item_name}
                </Text>
              </View>

              <View style={styles.badgesRow}>
                {item.is_labour && (
                  <View style={[styles.badge, styles.badgeLabour]}>
                    <Text style={styles.badgeLabourText}>SERVICE</Text>
                  </View>
                )}
                {item.hsn_code ? (
                  <View style={[styles.badge, styles.badgeHsn]}>
                    <Tag size={10} color={colors.textSecondary} style={{ marginRight: 2 }} />
                    <Text style={styles.badgeHsnText}>HSN: {item.hsn_code}</Text>
                  </View>
                ) : null}
                {canRemoveItems && onRemoveItem && (
                  <AppPressable
                    style={styles.deleteBtn}
                    onPress={() => onRemoveItem(item.id)}
                    hitSlop={8}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </AppPressable>
                )}
              </View>
            </View>

            {/* Serial Number (if attached to item) */}
            {item.serial_number ? (
              <View style={styles.itemSerialRow}>
                <Text style={styles.itemSerialText}>S/N: {item.serial_number}</Text>
              </View>
            ) : null}

            {/* Editing Controls Row: Qty | Price (₹) | Tax (%) */}
            <View style={styles.controlsRow}>
              {/* Quantity */}
              <View style={styles.controlGroupSmall}>
                <Text style={styles.controlLabel}>Qty</Text>
                {editable && !item.is_labour ? (
                  <TextInput
                    style={styles.controlInput}
                    keyboardType="numeric"
                    value={String(qty)}
                    onChangeText={(val) => handleQtyChange(item.id, val)}
                  />
                ) : (
                  <View style={styles.controlStaticBox}>
                    <Text style={styles.controlStaticText}>{qty}</Text>
                  </View>
                )}
              </View>

              {/* Price (Editable) */}
              <View style={styles.controlGroupMedium}>
                <Text style={styles.controlLabel}>Price (₹)</Text>
                {editable ? (
                  <TextInput
                    style={styles.controlInput}
                    keyboardType="numeric"
                    value={String(price)}
                    onChangeText={(val) => handlePriceChange(item.id, val)}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                ) : (
                  <View style={styles.controlStaticBox}>
                    <Text style={styles.controlStaticText}>₹{price.toFixed(2)}</Text>
                  </View>
                )}
              </View>

              {/* Tax % (Editable, defaults to 18) */}
              <View style={styles.controlGroupSmall}>
                <Text style={styles.controlLabel}>Tax (%)</Text>
                {editable ? (
                  <TextInput
                    style={styles.controlInput}
                    keyboardType="numeric"
                    value={String(taxRate)}
                    onChangeText={(val) => handleTaxChange(item.id, val)}
                    placeholder="18"
                    placeholderTextColor={colors.textMuted}
                  />
                ) : (
                  <View style={styles.controlStaticBox}>
                    <Text style={styles.controlStaticText}>{taxRate}%</Text>
                  </View>
                )}
              </View>

              {/* Line Total */}
              <View style={styles.lineTotalGroup}>
                <Text style={styles.controlLabelRight}>Line Total</Text>
                <Text style={styles.lineTotalValue}>{formatCurrency(lineTotal)}</Text>
                <Text style={styles.lineTaxSubtext}>
                  (Tax: {formatCurrency(lineTaxAmount)})
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  deviceSerialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  deviceSerialLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  deviceSerialValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 4,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.card,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  typeIcon: {
    marginRight: spacing.xs,
  },
  itemName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeLabour: {
    backgroundColor: '#F3E8FF',
    borderColor: '#D8B4FE',
  },
  badgeLabourText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7E22CE',
  },
  badgeHsn: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  badgeHsnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteBtn: {
    padding: 2,
    marginLeft: 4,
  },
  itemSerialRow: {
    marginBottom: spacing.xs,
    paddingLeft: 22,
  },
  itemSerialText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  controlGroupSmall: {
    width: 54,
  },
  controlGroupMedium: {
    flex: 1,
  },
  lineTotalGroup: {
    width: 90,
    alignItems: 'flex-end',
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  controlLabelRight: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
    textAlign: 'right',
  },
  controlInput: {
    backgroundColor: '#F8FAFC',
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 34,
    textAlign: 'center',
  },
  controlStaticBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlStaticText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  lineTotalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lineTaxSubtext: {
    fontSize: 9,
    color: colors.textMuted,
  },
});
