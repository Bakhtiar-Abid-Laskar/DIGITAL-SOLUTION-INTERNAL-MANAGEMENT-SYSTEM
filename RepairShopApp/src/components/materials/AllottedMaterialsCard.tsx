import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { Package, User, Wrench, Calendar, RotateCcw, Bell } from 'lucide-react-native';
import { colors, radius, spacing, typography, shadow } from '../../tokens';

export interface AllottedMaterialRecord {
  id: string;
  material_name: string;
  quantity: number;
  unit_cost: number;
  total_cost?: number;
  created_at: string;
  technician_id?: string;
  technician_name?: string;
  job_id?: string;
  job_code?: string;
  customer_name?: string;
  // For material_allotments table
  source?: 'allotments' | 'job_materials';
}

interface AllottedMaterialsCardProps {
  item: AllottedMaterialRecord;
  onPressJob?: (jobId: string) => void;
  showTechnician?: boolean;
  showActions?: boolean;
  onMarkReturned?: (id: string) => void;
  onNotify?: (technicianId: string) => void;
  returning?: boolean;
}

export default function AllottedMaterialsCard({
  item,
  onPressJob,
  showTechnician = true,
  showActions = false,
  onMarkReturned,
  onNotify,
  returning = false,
}: AllottedMaterialsCardProps) {
  const formattedDate = new Date(item.created_at).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.itemTitleWrap}>
          <Package size={18} color={colors.primary} style={styles.icon} />
          <Text style={styles.itemName} numberOfLines={1}>
            {item.material_name}
          </Text>
        </View>
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText}>{item.quantity} units</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsGrid}>
        {showTechnician && item.technician_name ? (
          <View style={styles.detailRow}>
            <View style={styles.labelWithIcon}>
              <User size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.detailLabel}>Technician:</Text>
            </View>
            <Text style={styles.detailValue}>{item.technician_name}</Text>
          </View>
        ) : null}

        {item.job_code || item.customer_name ? (
          <AppPressable
            style={styles.detailRow}
            disabled={!item.job_id || !onPressJob}
            onPress={() => item.job_id && onPressJob && onPressJob(item.job_id)}
          >
            <View style={styles.labelWithIcon}>
              <Wrench size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.detailLabel}>Source Job:</Text>
            </View>
            <Text style={[styles.detailValue, item.job_id && onPressJob && styles.linkText]}>
              {item.job_code || 'View Job'} {item.customer_name ? `(${item.customer_name})` : ''}
            </Text>
          </AppPressable>
        ) : null}

        <View style={styles.detailRow}>
          <View style={styles.labelWithIcon}>
            <Calendar size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.detailLabel}>Allotted On:</Text>
          </View>
          <Text style={styles.dateValue}>{formattedDate}</Text>
        </View>
      </View>

      {/* Admin/Receptionist Action Buttons */}
      {showActions && (
        <View style={styles.actions}>
          {onNotify && item.technician_id ? (
            <AppPressable
              style={styles.notifyBtn}
              onPress={() => onNotify(item.technician_id!)}
            >
              <Bell size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.notifyBtnText}>Remind</Text>
            </AppPressable>
          ) : null}
          {onMarkReturned ? (
            <AppPressable
              style={[styles.returnBtn, returning && styles.returnBtnDisabled]}
              onPress={() => !returning && onMarkReturned(item.id)}
              disabled={returning}
            >
              <RotateCcw size={14} color={colors.textInverse} style={{ marginRight: 4 }} />
              <Text style={styles.returnBtnText}>{returning ? 'Processing...' : 'Mark Returned'}</Text>
            </AppPressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  icon: {
    marginRight: spacing.xs,
  },
  itemName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
  },
  qtyBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  qtyText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  detailsGrid: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  dateValue: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  notifyBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  returnBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.success,
  },
  returnBtnDisabled: {
    backgroundColor: colors.textMuted,
  },
  returnBtnText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
});
