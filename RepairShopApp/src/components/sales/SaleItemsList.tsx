import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { Package, Plus, Trash2 } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

type SaleItem = {
  clientId?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  product_id: string | null;
};

type InventorySuggestion = {
  id: string;
  product_id: string;
  item_name: string;
  quantity: number;
  cost_price: number;
  unit?: string | null;
};

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

interface Props {
  items: SaleItem[];
  errors: Record<string, string>;
  activeItemIndex: number | null;
  inventorySuggestions: InventorySuggestion[];
  inventoryLoading: boolean;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, updates: Partial<SaleItem>) => void;
  onFocusItem: (index: number) => void;
  onSelectSuggestion: (index: number, suggestion: InventorySuggestion) => void;
}

export function SaleItemsList({
  items, errors, activeItemIndex, inventorySuggestions, inventoryLoading,
  onAddItem, onRemoveItem, onUpdateItem, onFocusItem, onSelectSuggestion,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.sectionTitle}>Sale Items</Text>
        <AppPressable style={styles.addItemButton} onPress={onAddItem}>
          <Plus size={16} color={colors.textInverse} />
          <Text style={styles.addItemText}>Add Item</Text>
        </AppPressable>
      </View>

      {errors.items ? <Text style={styles.errorText}>{errors.items}</Text> : null}

      {items.map((item, index) => (
        <View key={item.clientId || index} style={styles.saleItemCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Item Name</Text>
            <View style={styles.searchWrap}>
              <Package size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.searchInput]}
                placeholder="Search inventory item"
                placeholderTextColor={colors.textMuted}
                value={item.item_name}
                onFocus={() => { onFocusItem(index); }}
                onChangeText={(value) => {
                  onFocusItem(index);
                  onUpdateItem(index, { item_name: value });
                }}
              />
            </View>
            {errors[`item_name_${index}`] ? <Text style={styles.errorText}>{errors[`item_name_${index}`]}</Text> : null}

            {activeItemIndex === index && item.item_name.trim().length >= 2 && (
              <View style={styles.suggestionBox}>
                {inventoryLoading ? (
                  <Text style={styles.suggestionEmpty}>Searching inventory...</Text>
                ) : inventorySuggestions.length === 0 ? (
                  <Text style={styles.suggestionEmpty}>No inventory items found.</Text>
                ) : (
                  inventorySuggestions.map((suggestion) => (
                    <AppPressable
                      key={suggestion.id}
                      style={styles.suggestionRow}
                      onPress={() => onSelectSuggestion(index, suggestion)}
                    >
                      <Text style={styles.suggestionTitle} numberOfLines={2}>{suggestion.item_name}</Text>
                      <Text style={styles.suggestionMeta}>
                        Stock: {suggestion.quantity} {suggestion.unit || ''} | Price: {currency.format(Number(suggestion.cost_price || 0))}
                      </Text>
                    </AppPressable>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: spacing.md }]}>
              <Text style={styles.fieldLabel}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={String(item.quantity)}
                onChangeText={value => onUpdateItem(index, { quantity: Number(value || 0) })}
              />
              {errors[`quantity_${index}`] ? <Text style={styles.errorText}>{errors[`quantity_${index}`]}</Text> : null}
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Price</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={String(item.unit_price)}
                onChangeText={value => onUpdateItem(index, { unit_price: Number(value || 0) })}
              />
              {errors[`unit_price_${index}`] ? <Text style={styles.errorText}>{errors[`unit_price_${index}`]}</Text> : null}
            </View>
          </View>

          <View style={styles.rowFooter}>
            <Text style={styles.lineTotalLabel}>Line Total</Text>
            <Text style={styles.lineTotalValue}>{currency.format(Number(item.quantity || 0) * Number(item.unit_price || 0))}</Text>
            <AppPressable onPress={() => onRemoveItem(index)} disabled={items.length === 1}
              style={[styles.removeButton, items.length === 1 && styles.removeButtonDisabled]}>
              <Trash2 size={16} color={items.length === 1 ? colors.textMuted : colors.accentRed} />
            </AppPressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  addItemButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, borderRadius: radius.sm,
  },
  addItemText: { ...typography.caption, color: colors.textInverse, fontWeight: '600' },
  saleItemCard: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.backgroundAlt,
  },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md,
    color: colors.textPrimary, ...typography.body, borderWidth: 1, borderColor: colors.border,
  },
  searchWrap: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  searchInput: { flex: 1, paddingLeft: spacing.xl + spacing.xs },
  inputIcon: { position: 'absolute', left: spacing.md, zIndex: 1 },
  suggestionBox: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface, marginTop: spacing.xs, overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  suggestionTitle: { ...typography.bodyBold, color: colors.textPrimary },
  suggestionMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  suggestionEmpty: { padding: spacing.md, color: colors.textMuted, fontSize: 13 },
  row: { flexDirection: 'row' },
  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  lineTotalLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  lineTotalValue: { ...typography.bodyBold, color: colors.textPrimary, marginRight: spacing.md },
  removeButton: { padding: spacing.xs },
  removeButtonDisabled: { opacity: 0.3 },
  errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
});
