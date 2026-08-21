import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import BottomSheet from '../common/BottomSheet';
import { colors, radius, spacing, typography } from '../../tokens';

interface Props {
  visible: boolean;
  isEditing: boolean;
  saving: boolean;
  
  // Product Info
  itemName: string;
  sku: string;
  unit: string;
  hsnSac: string;
  taxMode: 'inclusive' | 'exclusive';
  cgstRate: string;
  sgstRate: string;
  igstRate: string;

  // Stock & Pricing
  costPrice: string;
  sellingRate: string;
  quantity: string;
  threshold: string;
  minStockLevel: string;
  location: string;

  onChangeName: (v: string) => void;
  onChangeSku: (v: string) => void;
  onChangeUnit: (v: string) => void;
  onChangeHsnSac: (v: string) => void;
  onChangeTaxMode: (v: 'inclusive' | 'exclusive') => void;
  onChangeCgst: (v: string) => void;
  onChangeSgst: (v: string) => void;
  onChangeIgst: (v: string) => void;

  onChangeCost: (v: string) => void;
  onChangeSelling: (v: string) => void;
  onChangeQty: (v: string) => void;
  onChangeThreshold: (v: string) => void;
  onChangeMinStock: (v: string) => void;
  onChangeLocation: (v: string) => void;

  onClose: () => void;
  onSave: () => void;
}

export function InventoryFormSheet({
  visible, isEditing, saving, 
  itemName, sku, unit, hsnSac, taxMode, cgstRate, sgstRate, igstRate,
  costPrice, sellingRate, quantity, threshold, minStockLevel, location,
  onChangeName, onChangeSku, onChangeUnit, onChangeHsnSac, onChangeTaxMode, onChangeCgst, onChangeSgst, onChangeIgst,
  onChangeCost, onChangeSelling, onChangeQty, onChangeThreshold, onChangeMinStock, onChangeLocation,
  onClose, onSave,
}: Props) {
  const [activeTab, setActiveTab] = useState<'info' | 'stock'>('info');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = () => {
    if (!itemName.trim()) {
      setErrorMsg('Product name is required');
      setActiveTab('info');
      return;
    }
    setErrorMsg('');
    onSave();
  };

  // Reset tab on open
  React.useEffect(() => {
    if (visible) {
      setActiveTab('info');
      setErrorMsg('');
    }
  }, [visible]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Text style={styles.sheetTitle}>{isEditing ? 'Edit Item' : 'Add Item'}</Text>

        <View style={styles.tabsContainer}>
          <AppPressable 
            style={[styles.tab, activeTab === 'info' && styles.tabActive]} 
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Product Info</Text>
          </AppPressable>
          <AppPressable 
            style={[styles.tab, activeTab === 'stock' && styles.tabActive]} 
            onPress={() => setActiveTab('stock')}
          >
            <Text style={[styles.tabText, activeTab === 'stock' && styles.tabTextActive]}>Stock & Pricing</Text>
          </AppPressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'info' ? (
            <View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  style={[styles.input, errorMsg ? styles.inputError : null]} placeholder="e.g. iPhone 13 Screen"
                  placeholderTextColor={colors.textMuted} value={itemName} onChangeText={onChangeName}
                />
                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
              </View>
              
              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>SKU</Text>
                  <TextInput
                    style={styles.input} placeholder="Optional"
                    placeholderTextColor={colors.textMuted} value={sku} onChangeText={onChangeSku}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Unit of Measure</Text>
                  <TextInput
                    style={styles.input} placeholder="Pcs"
                    placeholderTextColor={colors.textMuted} value={unit} onChangeText={onChangeUnit}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>HSN/SAC Code</Text>
                <TextInput
                  style={styles.input} placeholder="Optional"
                  placeholderTextColor={colors.textMuted} value={hsnSac} onChangeText={onChangeHsnSac}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tax Mode</Text>
                <View style={styles.row}>
                  <AppPressable 
                    style={[styles.radioBtn, taxMode === 'exclusive' && styles.radioBtnActive]} 
                    onPress={() => onChangeTaxMode('exclusive')}
                  >
                    <Text style={[styles.radioText, taxMode === 'exclusive' && styles.radioTextActive]}>Exclusive</Text>
                  </AppPressable>
                  <AppPressable 
                    style={[styles.radioBtn, taxMode === 'inclusive' && styles.radioBtnActive]} 
                    onPress={() => onChangeTaxMode('inclusive')}
                  >
                    <Text style={[styles.radioText, taxMode === 'inclusive' && styles.radioTextActive]}>Inclusive</Text>
                  </AppPressable>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>CGST %</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={cgstRate} onChangeText={onChangeCgst} />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>SGST %</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={sgstRate} onChangeText={onChangeSgst} />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>IGST %</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={igstRate} onChangeText={onChangeIgst} />
                </View>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Purchase Rate (Cost)</Text>
                  <TextInput
                    style={styles.input} placeholder="0.00" placeholderTextColor={colors.textMuted}
                    keyboardType="numeric" value={costPrice} onChangeText={onChangeCost}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Selling Rate (Base)</Text>
                  <TextInput
                    style={styles.input} placeholder="0.00" placeholderTextColor={colors.textMuted}
                    keyboardType="numeric" value={sellingRate} onChangeText={onChangeSelling}
                  />
                </View>
              </View>

              {!isEditing && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Opening Stock Quantity</Text>
                  <TextInput
                    style={styles.input} placeholder="0" placeholderTextColor={colors.textMuted}
                    keyboardType="numeric" value={quantity} onChangeText={onChangeQty}
                  />
                  <Text style={styles.helperText}>
                    Enter the initial physical count. To add stock later, use the Purchase Order flow.
                  </Text>
                </View>
              )}

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Low Stock Threshold</Text>
                  <TextInput
                    style={styles.input} placeholder="5" placeholderTextColor={colors.textMuted}
                    keyboardType="numeric" value={threshold} onChangeText={onChangeThreshold}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Min Stock Level</Text>
                  <TextInput
                    style={styles.input} placeholder="0" placeholderTextColor={colors.textMuted}
                    keyboardType="numeric" value={minStockLevel} onChangeText={onChangeMinStock}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Warehouse Location</Text>
                <TextInput
                  style={styles.input} placeholder="e.g. Shelf A1"
                  placeholderTextColor={colors.textMuted} value={location} onChangeText={onChangeLocation}
                />
              </View>
            </View>
          )}

          <AppPressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.background} size="small" />
              : <Text style={styles.saveBtnText}>Save Item</Text>}
          </AppPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.sm },
  tabsContainer: { flexDirection: 'row', marginBottom: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  tabActive: { borderColor: colors.primary },
  tabText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  scrollContent: { paddingBottom: spacing.xxl },
  formGroup: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  label: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48,
    ...typography.body, color: colors.textPrimary,
  },
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, ...typography.caption, marginTop: spacing.xs },
  helperText: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xs, lineHeight: 16 },
  radioBtn: { 
    flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundAlt,
  },
  radioBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  radioText: { ...typography.body, color: colors.textSecondary },
  radioTextActive: { color: colors.primary, fontWeight: '600' },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md, height: 48,
    justifyContent: 'center', alignItems: 'center', marginTop: spacing.xs,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { ...typography.bodyBold, color: colors.background },
});
