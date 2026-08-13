import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../tokens';
import { SkeletonList } from '../../components/common/SkeletonCard';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.headerSpacer} />
      <SkeletonList count={5} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSpacer: {
    height: 100, // Approximate header height for skeleton alignment
  },
});
