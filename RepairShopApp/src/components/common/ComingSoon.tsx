import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Wallet, Clock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { AppPressable } from './AppPressable';

interface ComingSoonProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  onBackToDashboard?: () => void;
  showBackButton?: boolean;
}

export function ComingSoon({
  title = 'Coming Soon',
  description = 'The Salary section will be available soon.',
  icon,
  onBackToDashboard,
  showBackButton = false,
}: ComingSoonProps) {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const isSmallDevice = screenWidth < 380;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, spacing.lg),
          paddingBottom: Math.max(insets.bottom, spacing.xl),
        },
      ]}
    >
      <View style={[styles.card, isSmallDevice && styles.cardSmall]}>
        <View style={styles.iconCircle}>
          {icon || <Wallet size={36} color={colors.primary} />}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {(showBackButton || onBackToDashboard) && (
          <AppPressable
            style={styles.button}
            onPress={onBackToDashboard}
            accessibilityRole="button"
            accessibilityLabel="Back to Dashboard"
          >
            <Text style={styles.buttonText}>Back to Dashboard</Text>
          </AppPressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  cardSmall: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EFF6FF', // soft blue tint matching primary
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default ComingSoon;
