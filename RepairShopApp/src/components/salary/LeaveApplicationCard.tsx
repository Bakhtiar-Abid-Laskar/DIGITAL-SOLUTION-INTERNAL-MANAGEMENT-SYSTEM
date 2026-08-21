import React from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { TrendingUp } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  leaveDate: string;
  leaveEndDate?: string;
  leaveReason: string;
  leaveSaving: boolean;
  onChangeDate: (val: string) => void;
  onChangeEndDate?: (val: string) => void;
  onChangeReason: (val: string) => void;
  onSubmit: () => void;
}

export function LeaveApplicationCard({
  leaveDate, leaveEndDate, leaveReason, leaveSaving,
  onChangeDate, onChangeEndDate, onChangeReason, onSubmit,
}: Props) {
  const [showPicker, setShowPicker] = React.useState(false);
  const [showEndPicker, setShowEndPicker] = React.useState(false);

  const parsedDate = leaveDate ? new Date(leaveDate) : new Date();
  const parsedEndDate = leaveEndDate ? new Date(leaveEndDate) : new Date();

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Leave Date</Text>
      <View style={styles.inputBox}>
        <Text style={[styles.label, { color: colors.textMuted, fontSize: 11 }]}>
          Select date for your leave
        </Text>
        <AppPressable 
          style={styles.inputContainer} 
          onPress={() => setShowPicker(true)}
        >
          <Text style={[styles.textInput, !leaveDate && { color: colors.textMuted }]}>
            {leaveDate || "Select Date (YYYY-MM-DD)"}
          </Text>
        </AppPressable>
        {showPicker && (
          <DateTimePicker
            value={parsedDate}
            mode="date"
            display="default"
            onChange={(event: any, selectedDate?: Date) => {
              setShowPicker(false);
              if (selectedDate) {
                const tzOffset = selectedDate.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(selectedDate.getTime() - tzOffset)).toISOString().slice(0, 10);
                onChangeDate(localISOTime);
              }
            }}
          />
        )}
      </View>

      <Text style={[styles.label, { marginTop: spacing.sm }]}>End Date (Optional)</Text>
      <View style={styles.inputBox}>
        <Text style={[styles.label, { color: colors.textMuted, fontSize: 11 }]}>
          Select only for multi-day leave
        </Text>
        <AppPressable 
          style={styles.inputContainer} 
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={[styles.textInput, !leaveEndDate && { color: colors.textMuted }]}>
            {leaveEndDate || "Select End Date (YYYY-MM-DD)"}
          </Text>
        </AppPressable>
        {showEndPicker && (
          <DateTimePicker
            value={parsedEndDate}
            mode="date"
            display="default"
            onChange={(event: any, selectedDate?: Date) => {
              setShowEndPicker(false);
              if (selectedDate) {
                const tzOffset = selectedDate.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(selectedDate.getTime() - tzOffset)).toISOString().slice(0, 10);
                onChangeEndDate?.(localISOTime);
              }
            }}
          />
        )}
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
