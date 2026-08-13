import React from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { TrendingUp } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

interface Props {
  leaveDate: string;
  leaveReason: string;
  leaveSaving: boolean;
  onChangleDate: (val: string) => void;
  onChangeReason: (val: string) => void;
  onSubmit: () => void;
}

export function LeaveApplicationCard({
  leaveDate, leaveReason, leaveSaving,
  onChangleDate, onChangeReason, onSubmit,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Leave Date</Text>
      <View style={styles.inputBox}>
        <Text style={[styles.label, { color: colors.textMuted, fontSize: 11 }]}>
          Enter date in YYYY-MM-DD format
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={leaveDate}
            onChangeText={onChangleDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>
      </View>
      <Text style={[styles.label, { marginTop: spacing.sm }]}>Reason (optional)</Text>
      <View style={[styles.inputContainer, { marginTop: 4 }]}>
        <TextInput
          style={styles.textInput}
          value={leaveReason}
          onChangeText={onChangeReason}
          placeholder="e.g. Personal, medical..."
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <AppPressable style={styles.leaveBtn} onPress={onSubmit} disabled={leaveSaving}>
        {leaveSaving
          ? <ActivityIndicator size="small" color="#fff" />
          : <TrendingUp size={16} color="#fff" />}
        <Text style={styles.leaveText}>{leaveSaving ? 'Submitting...' : 'Submit Leave Request'}</Text>
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  label: { ...typography.body, color: colors.textSecondary },
  inputBox: { marginTop: 4, marginBottom: spacing.xs },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt,
    marginTop: 4,
  },
  textInput: {
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  leaveText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
