import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { Trash2, Camera, Hash } from 'lucide-react-native';
import { JobMaterial } from '../../types/job';
import { formatCurrency } from '@repairshop/shared';
import { colors, radius, spacing, typography } from '../../tokens';

interface MaterialListProps {
  materials: JobMaterial[];
  onDelete?: (id: string) => void;
  canEdit: boolean;
  hidePricing?: boolean;
}

export default function MaterialList({ materials, onDelete, canEdit, hidePricing = false }: MaterialListProps) {
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
              
              {mat.serial_number && mat.serial_number.trim() ? (
                <View style={styles.serialBadge}>
                  <Hash size={11} color={colors.primary} style={{ marginRight: 2 }} />
                  <Text style={styles.serialLabel}>S/N: </Text>
                  <Text style={styles.serialValue}>{mat.serial_number}</Text>
                </View>
              ) : (
                <Text style={styles.missingSerialWarning}>⚠️ Missing Serial Number</Text>
              )}

              {!hidePricing && (
                <Text style={styles.cost}>@ {formatCurrency(mat.unit_cost)} = {formatCurrency(mat.total_cost)}</Text>
              )}
              {mat.photo_drive_file_id && (
                <View style={styles.photoIndicator}>
                  <Camera size={14} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
                  <Text style={styles.photoText}>Photo attached</Text>
                </View>
              )}
            </View>
            {canEdit && onDelete && (
              <AppPressable style={styles.deleteBtn} onPress={() => onDelete(mat.id)} accessibilityRole="button" accessibilityLabel="Delete material">
                <Trash2 size={20} color={colors.error} />
              </AppPressable>
            )}
          </View>
        ))
      )}
      {!hidePricing && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Parts Total:</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
      )}
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
  serialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    marginTop: 3,
    marginBottom: 2,
  },
  serialLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'Inter-SemiBold',
  },
  serialValue: {
    fontSize: 11,
    color: colors.textPrimary,
    fontFamily: 'Inter-Medium',
  },
  missingSerialWarning: {
    fontSize: 11,
    color: colors.error,
    fontFamily: 'Inter-SemiBold',
    marginTop: 2,
  },
  cost: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  photoText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
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
