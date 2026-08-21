import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import ModalShell from '../common/ModalShell';
import Button from '../common/Button';
import { colors, radius, spacing, typography } from '../../tokens';
import { Package, CheckCircle2 } from 'lucide-react-native';

type MaterialEntry = {
  id: string;
  material_name: string;
  qty_taken?: number | null;
  added_qty?: number | null;
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
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <CheckCircle2 size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Confirm Material Usage</Text>
            <Text style={styles.subtitle}>
              Specify how many units were used on this job. Unused units will move to your allocated holding.
            </Text>
          </View>
        </View>

        <ScrollView style={styles.listContainer} bounces={false}>
          {materials.map(item => {
            const added = Number(item.added_qty ?? item.qty_taken ?? item.quantity ?? 1);
            const rawVal = usageQuantities[item.id] ?? String(added);
            const parsedUsed = parseFloat(rawVal);
            const validUsed = isNaN(parsedUsed) ? 0 : Math.max(0, Math.min(added, parsedUsed));
            const remaining = Math.max(0, added - validUsed);

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Package size={16} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
                  <Text style={styles.itemName} numberOfLines={1}>{item.material_name}</Text>
                </View>

                <View style={styles.itemRow}>
                  <View>
                    <Text style={styles.itemMeta}>Total Added: {added} unit(s)</Text>
                    {remaining > 0 ? (
                      <Text style={styles.remainingPill}>+{remaining} Unused (Holding)</Text>
                    ) : (
                      <Text style={styles.allUsedPill}>All Used</Text>
                    )}
                  </View>

                  <View style={styles.usedRow}>
                    <Text style={styles.usedLabel}>Used:</Text>
                    <TextInput
                      style={styles.usedInput}
                      keyboardType="numeric"
                      value={rawVal}
                      onChangeText={(val) => onChangeQty(item.id, val)}
                      selectTextOnFocus
                    />
                    <Text style={styles.totalSuffix}>/ {added}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1 }} disabled={updating} />
          <Button label="Complete & Reconcile" onPress={onConfirm} loading={updating} style={{ flex: 2, backgroundColor: colors.success }} />
        </View>
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  headerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.statusCompletedBg,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: 2 },
  subtitle: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  listContainer: { maxHeight: 280, marginVertical: spacing.sm },
  itemCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  itemName: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  itemMeta: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  remainingPill: { ...typography.caption, color: colors.warning, fontWeight: '700' },
  allUsedPill: { ...typography.caption, color: colors.success, fontWeight: '600' },
  usedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  usedLabel: { ...typography.bodyBold, color: colors.textPrimary },
  usedInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 54,
    textAlign: 'center',
    ...typography.bodyBold,
  },
  totalSuffix: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});
