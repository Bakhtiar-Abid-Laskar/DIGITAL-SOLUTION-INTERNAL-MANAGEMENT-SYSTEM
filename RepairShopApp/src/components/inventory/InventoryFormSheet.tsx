import React from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import BottomSheet from '../common/BottomSheet';
import { colors, radius, spacing, typography } from '../../tokens';

interface Props {
  visible: boolean;
  isEditing: boolean;
  saving: boolean;
  itemName: string;
  quantity: string;
  costPrice: string;
  unit: string;
  threshold: string;
  onChangeName: (v: string) => void;
  onChangeQty: (v: string) => void;
  onChangeCost: (v: string) => void;
  onChangeUnit: (v: string) => void;
  onChangeThreshold: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function InventoryFormSheet({
  visible, isEditing, saving, itemName, quantity, costPrice, unit, threshold,
  onChangeName, onChangeQty, onChangeCost, onChangeUnit, onChangeThreshold,
  onClose, onSave,
}: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Text style={styles.sheetTitle}>{isEditing ? 'Edit Item' : 'Add Item'}</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input} placeholder="e.g. iPhone 13 Screen"
            placeholderTextColor={colors.textMuted} value={itemName} onChangeText={onChangeName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input} placeholder="0" placeholderTextColor={colors.textMuted}
              keyboardType="numeric" value={quantity} onChangeText={onChangeQty}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Unit</Text>
            <TextInput
              style={styles.input} placeholder="pcs, ml, etc." placeholderTextColor={colors.textMuted}
              value={unit} onChangeText={onChangeUnit}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Cost Price (₹)</Text>
            <TextInput
              style={styles.input} placeholder="0.00" placeholderTextColor={colors.textMuted}
              keyboardType="numeric" value={costPrice} onChangeText={onChangeCost}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Low Stock Alert At</Text>
            <TextInput
              style={styles.input} placeholder="5" placeholderTextColor={colors.textMuted}
              keyboardType="numeric" value={threshold} onChangeText={onChangeThreshold}
            />
          </View>
        </View>

        <AppPressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={onSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={colors.background} size="small" />
            : <Text style={styles.saveBtnText}>Save Item</Text>}
        </AppPressable>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.sm },
  formGroup: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  label: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48,
    ...typography.body, color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md, height: 48,
    justifyContent: 'center', alignItems: 'center', marginTop: spacing.md,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { ...typography.bodyBold, color: colors.background },
});
