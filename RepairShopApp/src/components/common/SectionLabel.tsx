import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { colors, typography, spacing } from '../../tokens';

interface SectionLabelProps {
  title: string;
  rightElement?: React.ReactNode;
}

export default function SectionLabel({ title, rightElement }: SectionLabelProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.text}>{title}</Text>
      {rightElement}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.lg,
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    ...typography.label,
    color: colors.textMuted,
  },
});
