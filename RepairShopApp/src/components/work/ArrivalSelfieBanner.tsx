import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { MapPin, ArrowRight } from 'lucide-react-native';
import { AppPressable } from '../common/AppPressable';
import { colors, radius, spacing, typography, shadow } from '../../tokens';

interface Props {
  onNavigate: () => void;
}

export function ArrivalSelfieBanner({ onNavigate }: Props) {
  return (
    <Animated.View entering={FadeInUp.springify()} style={styles.gateCard}>
      <View style={styles.iconWrapper}>
        <MapPin size={24} color={colors.primary} />
      </View>
      <Text style={styles.title}>Arrival Check-In Required</Text>
      <Text style={styles.body}>
        This is an Onsite service job. You must take an arrival selfie at the customer location and record GPS coordinates before diagnosing or logging work on this device.
      </Text>
      <AppPressable
        style={styles.btn}
        onPress={onNavigate}
        accessibilityRole="button"
        accessibilityLabel="Complete Arrival Check-In"
      >
        <Text style={styles.btnText}>Complete Arrival Check-In</Text>
        <ArrowRight size={16} color={colors.textInverse} style={styles.btnIcon} />
      </AppPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gateCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceIconChip,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    minHeight: 48,
    width: '100%',
  },
  btnText: {
    ...typography.bodyBold,
    color: colors.textInverse,
    marginRight: spacing.xs,
  },
  btnIcon: {
    marginLeft: spacing.xs,
  },
});
