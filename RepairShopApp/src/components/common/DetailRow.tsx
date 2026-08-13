import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from './AppPressable';
import { ChevronRight } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

export interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
  /** Show a right chevron and make the row tappable */
  onPress?: () => void;
  /** Render custom content on the right instead of plain text */
  rightElement?: React.ReactNode;
  /** Show a thin divider below this row */
  showDivider?: boolean;
}

/**
 * Canonical label/value row used across all job detail, customer, and device sections.
 * Replaces the duplicated InfoRow pattern in JobDetailShell, JobAssignmentScreen, JobDetailScreen.
 */
export default function DetailRow({
  label,
  value,
  valueColor,
  onPress,
  rightElement,
  showDivider = false,
}: DetailRowProps) {
  const rowContent = (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {rightElement ?? (
        <Text
          style={[styles.value, valueColor ? { color: valueColor } : null]}
          numberOfLines={2}
        >
          {value}
        </Text>
      )}
      {onPress && <ChevronRight size={16} color={colors.textMuted} style={styles.chevron} />}
    </View>
  );

  return (
    <>
      {onPress ? (
        <AppPressable onPress={onPress} activeOpacity={0.7}>
          {rowContent}
        </AppPressable>
      ) : (
        rowContent
      )}
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,   // 8px — comfortable row height
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 2,
  },
  value: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 3,
    textAlign: 'right',
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
