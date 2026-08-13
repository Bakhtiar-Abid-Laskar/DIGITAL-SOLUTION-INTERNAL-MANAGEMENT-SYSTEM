import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { colors, radius, spacing, typography } from '../../tokens';

export interface SegmentOption {
  label: string;
  value: string;
  activeBgColor?: string; // e.g. for Urgent, High, Normal semantic colors
  activeTextColor?: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  defaultActiveBg?: string;
  defaultActiveText?: string;
}

export default function SegmentedControl({
  options,
  selectedValue,
  onValueChange,
  defaultActiveBg = colors.primary,
  defaultActiveText = colors.textInverse,
}: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = option.value === selectedValue;
        const bg = isActive ? (option.activeBgColor || defaultActiveBg) : 'transparent';
        const textColor = isActive ? (option.activeTextColor || defaultActiveText) : colors.textSecondary;
        
        return (
          <AppPressable
            key={option.value}
            style={[
              styles.segment,
              { backgroundColor: bg },
              isActive ? styles.segmentActive : null
            ]}
            onPress={() => onValueChange(option.value)}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
          >
            <Text style={[styles.label, { color: textColor }]}>
              {option.label}
            </Text>
          </AppPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentActive: {
    // shadow or border for active state could go here, but background color usually suffices
  },
  label: {
    ...typography.bodyBold,
  },
});
