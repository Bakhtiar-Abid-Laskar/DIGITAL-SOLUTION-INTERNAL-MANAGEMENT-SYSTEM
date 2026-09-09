import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AlertTriangle, Camera } from 'lucide-react-native';
import { AppPressable } from '../common/AppPressable';
import { colors, radius, spacing, typography } from '../../tokens';

interface Props {
  onNavigate: () => void;
}

export function CompletionSelfieBanner({ onNavigate }: Props) {
  return (
    <Animated.View entering={FadeInUp.springify()} style={styles.gateBanner}>
      <View style={styles.headerRow}>
        <AlertTriangle size={18} color={colors.statusUrgentFg} style={styles.icon} />
        <Text style={styles.title}>Completion Selfie Required</Text>
      </View>
      <Text style={styles.body}>
        You must capture a departure selfie at the customer location before marking this job as Completed.
      </Text>
      <AppPressable
        style={styles.btn}
        onPress={onNavigate}
        accessibilityRole="button"
        accessibilityLabel="Take Completion Selfie"
      >
        <Camera size={16} color={colors.textInverse} style={styles.btnIcon} />
        <Text style={styles.btnText}>Take Completion Selfie</Text>
      </AppPressable>
    </Animated.View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  title: {
    ...typography.bodyBold,
    color: colors.statusUrgentFg,
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.statusUrgentFg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnIcon: {
    marginRight: spacing.xs,
  },
  btnText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
});
