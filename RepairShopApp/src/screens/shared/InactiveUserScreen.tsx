import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import Button from '../../components/common/Button';

const handleLogout = async () => {
  await supabase.auth.signOut();
};

export default function InactiveUserScreen() {
  const insets = useSafeAreaInsets();



  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.card}>
        <Text style={styles.title}>Account Inactive</Text>
        <Text style={styles.message}>
          Your account is pending approval. Please contact your administrator to activate your account.
        </Text>
        <Button
          label="Sign Out"
          onPress={handleLogout}
          variant="secondary"
          style={styles.btn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.xxl,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  title: {
    ...typography.h2,
    color: colors.error,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  btn: {
    width: '100%',
  },
});
