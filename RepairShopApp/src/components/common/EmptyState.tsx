import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';
import Button from './Button';

type LucideIconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface EmptyStateProps {
  /**
   * Pass either:
   * - A Lucide icon component reference: icon={Package}   (function or forwardRef)
   * - A pre-rendered React element:       icon={<Package size={32} />}
   */
  icon?: LucideIconComponent | React.ReactElement;
  /** Primary empty message */
  message?: string;
  /** Secondary hint text */
  subMessage?: string;
  /** Legacy prop aliases (backwards compatibility) */
  heading?: string;
  subtext?: string;
  /** CTA button */
  ctaLabel?: string;
  onCta?: () => void;
  /** Compact mode: smaller padding, smaller icon — for use inside cards */
  compact?: boolean;
}

export default function EmptyState({
  icon,
  message,
  subMessage,
  heading,
  subtext,
  ctaLabel,
  onCta,
  compact = false,
}: EmptyStateProps) {
  // Support both new (message) and legacy (heading) prop names
  const displayMessage = message ?? heading ?? '';
  const displaySub = subMessage ?? subtext;

  // Determine if icon is a pre-rendered element or a component reference.
  // Using React.isValidElement() instead of typeof === 'function' because
  // lucide-react-native icons are forwardRef objects — typeof returns 'object',
  // not 'function' — so the old check always fell through, crashing the app.
  const renderIcon = () => {
    if (!icon) return <HelpCircle size={compact ? 24 : 36} color={colors.textMuted} strokeWidth={1.5} />;
    if (React.isValidElement(icon)) {
      // Already a rendered element — use as-is
      return icon;
    }
    // It's a component reference (function or forwardRef) — instantiate it
    const Icon = icon as LucideIconComponent;
    return <Icon size={compact ? 24 : 36} color={colors.textMuted} strokeWidth={1.5} />;
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.iconWrapper, compact && styles.iconWrapperCompact]}>
        {renderIcon()}
      </View>
      <Text style={[styles.heading, compact && styles.headingCompact]}>{displayMessage}</Text>
      {displaySub ? (
        <Text style={[styles.subtext, compact && styles.subtextCompact]}>{displaySub}</Text>
      ) : null}
      {ctaLabel && onCta && (
        <Button
          label={ctaLabel}
          onPress={onCta}
          variant="secondary"
          style={styles.cta}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'transparent',
  },
  containerCompact: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  iconWrapper: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt,
  },
  iconWrapperCompact: {
    width: 48,
    height: 48,
    marginBottom: spacing.sm,
  },
  heading: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  headingCompact: {
    ...typography.bodyBold,
  },
  subtext: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  subtextCompact: {
    marginBottom: spacing.xs,
  },
  cta: {
    marginTop: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.lg,
  },
});
