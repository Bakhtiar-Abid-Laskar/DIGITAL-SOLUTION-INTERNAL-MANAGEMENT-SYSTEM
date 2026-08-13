import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { colors, radius, spacing, typography } from '../../tokens';

interface Props {
  onNavigate: () => void;
}

export function CompletionSelfieBanner({ onNavigate }: Props) {
  return (
    <View style={styles.gateBanner}>
      <Text style={styles.title}>⚠️ Completion Selfie Required</Text>
      <Text style={styles.body}>
        You must take a departure selfie at the customer location before marking this job as Completed.
      </Text>
      <AppPressable
        style={styles.btn}
        onPress={onNavigate}
        accessibilityRole="button"
        accessibilityLabel="Take Completion Selfie"
      >
        <Text style={styles.btnText}>Take Completion Selfie →</Text>
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  gateBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.statusUrgentBg,
    borderWidth: 1,
    borderColor: colors.statusUrgentFg,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  title: { ...typography.bodyBold, color: colors.statusUrgentFg, marginBottom: spacing.xs },
  body: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.statusUrgentFg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnText: { ...typography.caption, color: colors.textInverse, fontWeight: '700' },
});
