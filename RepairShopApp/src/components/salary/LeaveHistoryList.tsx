import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing, typography } from '../../tokens';

type LeaveEntry = {
  id: string;
  leave_date: string;
  reason?: string | null;
  status: string;
};

interface Props {
  leaves: LeaveEntry[];
  loading: boolean;
}

export function LeaveHistoryList({ leaves, loading }: Props) {
  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />;
  }
  if (leaves.length === 0) {
    return (
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.lg }}>
        No recent leave requests.
      </Text>
    );
  }

  const badgeColor = (status: string) => {
    if (status === 'approved') return { bg: colors.statusCompletedBg, text: colors.accentGreen };
    if (status === 'rejected') return { bg: colors.accentRed + '20', text: colors.accentRed };
    return { bg: colors.warningAmberBg, text: colors.warningAmber };
  };

  return (
    <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
      {leaves.map((l, idx) => {
        const { bg, text } = badgeColor(l.status);
        return (
          <View
            key={l.id}
            style={[
              styles.row,
              { borderBottomWidth: idx === leaves.length - 1 ? 0 : 1 },
            ]}
          >
            <View>
              <Text style={styles.date}>{new Date(l.leave_date).toLocaleDateString()}</Text>
              <Text style={styles.reason}>{l.reason || 'No reason provided'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: bg }]}>
              <Text style={[styles.badgeText, { color: text }]}>
                {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border + '50',
  },
  date: { ...typography.bodyBold, color: colors.textPrimary },
  reason: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
