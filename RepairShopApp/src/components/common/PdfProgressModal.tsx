import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { FileText, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { colors, radius, spacing, typography, shadow, SPRING } from '../../tokens';
import Button from './Button';

export interface PdfProgressModalProps {
  visible: boolean;
  title: string;
  stageMessage: string;
  percent: number;
  error: string | null;
  onDismiss: () => void;
}

export function PdfProgressModal({
  visible,
  title,
  stageMessage,
  percent,
  error,
  onDismiss,
}: PdfProgressModalProps) {
  const animatedPercent = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      cardScale.value = withSpring(1, SPRING);
      cardOpacity.value = withTiming(1, { duration: 200 });
      animatedPercent.value = withTiming(Math.min(100, Math.max(0, percent)), {
        duration: 250,
      });
    } else {
      cardScale.value = withTiming(0.92, { duration: 150 });
      cardOpacity.value = withTiming(0, { duration: 150 });
      animatedPercent.value = 0;
    }
  }, [visible, percent]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${animatedPercent.value}%`,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  if (!visible) return null;

  const isComplete = percent >= 100 && !error;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={error ? onDismiss : undefined}
    >
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, animatedCardStyle]}>
          {/* Header Icon Chip */}
          <View
            style={[
              styles.iconChip,
              error
                ? styles.iconChipError
                : isComplete
                ? styles.iconChipSuccess
                : styles.iconChipNormal,
            ]}
          >
            {error ? (
              <AlertCircle size={24} color={colors.accentRed} />
            ) : isComplete ? (
              <CheckCircle2 size={24} color={colors.accentGreen} />
            ) : (
              <FileText size={24} color={colors.accentBlue} />
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {error ? 'Generation Failed' : isComplete ? 'Document Ready' : title}
          </Text>

          {/* Progress or Error Content */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorMessage}>{error}</Text>
              <Button
                label="Dismiss"
                variant="secondary"
                onPress={onDismiss}
                style={styles.dismissBtn}
              />
            </View>
          ) : (
            <View style={styles.progressContainer}>
              <View style={styles.statusRow}>
                <Text style={styles.stageText}>{stageMessage}</Text>
                <Text style={styles.percentText}>{Math.round(percent)}%</Text>
              </View>

              {/* Progress Track & Fill */}
              <View style={styles.track}>
                <Animated.View
                  style={[
                    styles.fill,
                    isComplete && styles.fillComplete,
                    animatedBarStyle,
                  ]}
                />
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...shadow.medium,
  },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconChipNormal: {
    backgroundColor: colors.surfaceIconChip,
  },
  iconChipSuccess: {
    backgroundColor: colors.statusCompletedBg,
  },
  iconChipError: {
    backgroundColor: colors.statusUrgentBg,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  progressContainer: {
    width: '100%',
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stageText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  percentText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  track: {
    height: 8,
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  fillComplete: {
    backgroundColor: colors.accentGreen,
  },
  errorContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dismissBtn: {
    width: '100%',
    height: 46,
  },
});

