import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import ModalShell from '../common/ModalShell';
import Button from '../common/Button';
import { colors, radius, spacing, typography } from '../../tokens';

type MaterialEntry = {
  id: string;
  material_name: string;
  qty_taken?: number | null;
  quantity: number;
};

interface Props {
  visible: boolean;
  materials: MaterialEntry[];
  usageQuantities: Record<string, string>;
  updating: boolean;
  onChangeQty: (id: string, val: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function MaterialUsageModal({
  visible, materials, usageQuantities, updating,
  onChangeQty, onCancel, onConfirm,
}: Props) {
  return (
    <ModalShell visible={visible} onClose={onCancel}>
      <View style={styles.container}>
        <Text style={styles.title}>Confirm Material Usage</Text>
        <Text style={styles.subtitle}>
          Enter how much of each material was actually used. Leftovers will be added to your allotted materials.
        </Text>

        <View style={styles.listContainer}>
          {materials.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemName}>{item.material_name}</Text>
              <View style={styles.itemRow}>
                <Text style={styles.itemMeta}>Taken: {item.qty_taken ?? item.quantity}</Text>
                <View style={styles.usedRow}>
                  <Text style={styles.usedLabel}>Used:</Text>
                  <TextInput
                    style={styles.usedInput}
                    keyboardType="numeric"
                    value={usageQuantities[item.id] ?? String(item.qty_taken ?? item.quantity)}
                    onChangeText={(val) => onChangeQty(item.id, val)}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
          <Button label="Confirm & Complete Job" onPress={onConfirm} loading={updating} style={{ flex: 2 }} />
        </View>
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  title: { ...typography.h2, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  listContainer: { maxHeight: 300 },
  itemCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemName: { ...typography.bodyBold, color: colors.textPrimary },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  itemMeta: { ...typography.caption, color: colors.textSecondary },
  usedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  usedLabel: { ...typography.bodyBold, color: colors.textPrimary },
  usedInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    width: 80,
    textAlign: 'center',
    ...typography.bodyBold,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});
