import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from './AppPressable';
import { AlertCircle } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../../tokens';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  secondaryLabel?: string;
  secondaryAction?: () => void;
}

export default function ErrorState({ message = 'An unexpected error occurred.', onRetry, secondaryLabel, secondaryAction }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <AlertCircle size={40} color={colors.error} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <AppPressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Try Again</Text>
        </AppPressable>
      )}
      {secondaryLabel && secondaryAction && (
        <AppPressable style={styles.secondaryButton} onPress={secondaryAction}>
          <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
        </AppPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.xl },
  iconContainer: { marginBottom: spacing.sm },
  title: { color: colors.error, ...typography.h2, marginBottom: spacing.xs },
  text: { color: colors.textMuted, ...typography.body, textAlign: 'center', marginBottom: spacing.xl },
  button: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  buttonText: { color: colors.textInverse, ...typography.bodyBold },
  secondaryButton: { marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.textSecondary, ...typography.bodyBold },
});
