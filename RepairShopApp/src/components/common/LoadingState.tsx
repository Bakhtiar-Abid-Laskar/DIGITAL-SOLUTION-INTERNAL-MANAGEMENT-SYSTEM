import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '../../tokens';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <Animated.View style={styles.container} entering={FadeIn.duration(300)}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  message: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
