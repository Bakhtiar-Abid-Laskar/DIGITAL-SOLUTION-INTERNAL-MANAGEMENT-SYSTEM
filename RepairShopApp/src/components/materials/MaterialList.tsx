import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { Trash2, Camera } from 'lucide-react-native';
import { JobMaterial } from '../../types/job';
import { formatCurrency } from '@repairshop/shared';
import { colors, radius, spacing, typography } from '../../tokens';

interface MaterialListProps {
  materials: JobMaterial[];
  onDelete: (id: string) => void;
  canEdit: boolean;
}

export default function MaterialList({ materials, onDelete, canEdit }: MaterialListProps) {
  const total = materials.reduce((sum, m) => sum + m.total_cost, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Materials Used</Text>
      {materials.length === 0 ? (
        <Text style={styles.empty}>No materials logged.</Text>
      ) : (
        materials.map(mat => (
          <View key={mat.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{mat.material_name} (x{mat.quantity})</Text>
              <Text style={styles.cost}>@ {formatCurrency(mat.unit_cost)} = {formatCurrency(mat.total_cost)}</Text>
              {mat.photo_url && (
                <View style={styles.photoAttached}>
                  <Camera size={14} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
                  <Text style={styles.photoText}>Photo attached</Text>
                </View>
              )}
            </View>
            {canEdit && (
              <AppPressable style={styles.deleteBtn} onPress={() => onDelete(mat.id)} accessibilityRole="button" accessibilityLabel="Delete material">
                <Trash2 size={20} color={colors.error} />
              </AppPressable>
            )}
          </View>
        ))
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Parts Total:</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md },
  title: { 
    color: colors.textPrimary, 
    ...typography.h3, 
    marginBottom: spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border, 
    paddingBottom: spacing.sm 
  },
  empty: { 
    color: colors.textMuted, 
    fontStyle: 'italic', 
    marginBottom: spacing.md,
    fontSize: 14,
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: spacing.sm, 
    backgroundColor: colors.backgroundAlt, 
    padding: spacing.sm, 
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: { flex: 1 },
  name: { color: colors.textPrimary, ...typography.bodyBold },
  cost: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },
  photoAttached: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  photoText: { color: colors.textSecondary, ...typography.caption },
  deleteBtn: { padding: spacing.sm },
  totalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: spacing.sm, 
    paddingTop: spacing.sm, 
    borderTopWidth: 1, 
    borderTopColor: colors.border 
  },
  totalLabel: { color: colors.textSecondary, ...typography.bodyBold },
  totalValue: { color: colors.success, ...typography.h3 }
});
