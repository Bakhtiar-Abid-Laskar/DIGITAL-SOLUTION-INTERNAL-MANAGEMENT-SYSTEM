import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, ShieldAlert } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import Button from '../../components/common/Button';

export default function InactiveUserScreen() {
  const insets = useSafeAreaInsets();
  const { refreshProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setChecking(true);
    setStatusMessage(null);
    try {
      await refreshProfile();
      setStatusMessage('Status checked. If your account is approved, the app will redirect automatically.');
    } catch {
      setStatusMessage('Could not verify status. Please check your network connection.');
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <ShieldAlert size={36} color={colors.statusWaitingFg} />
        </View>

        <Text style={styles.title}>Account Pending Approval</Text>
        <Text style={styles.message}>
          Your account has been registered but is awaiting administrator activation. Please contact your administrator to activate your account.
        </Text>

        {statusMessage ? (
          <View style={styles.statusBox}>
            <Clock size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        ) : null}

        <View style={styles.btnGroup}>
          <Button
            label={checking ? 'Checking Status...' : 'Check Approval Status'}
            onPress={handleCheckStatus}
            variant="primary"
            loading={checking}
            style={styles.btn}
          />
          <Button
            label="Sign Out"
            onPress={handleSignOut}
            variant="secondary"
            style={styles.btn}
          />
        </View>
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.statusWaitingBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
    width: '100%',
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  btnGroup: {
    width: '100%',
    gap: spacing.sm,
  },
  btn: {
    width: '100%',
  },
});
