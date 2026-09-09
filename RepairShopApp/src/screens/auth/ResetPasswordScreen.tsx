import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import Button from '../../components/common/Button';

export default function ResetPasswordScreen() {
  const { setIsPasswordRecovery, signOut } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async () => {
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      showToast({
        title: 'Password Updated',
        message: 'Your password has been changed successfully.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Mobile password update error:', err);
      setError(err.message || 'Failed to update password. Link may have expired.');
      showToast({
        title: 'Error',
        message: err.message || 'Failed to update password.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLogin = async () => {
    await signOut();
    setIsPasswordRecovery(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Lock size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Enter a secure new password for your account.
            </Text>
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <CheckCircle2 size={36} color={colors.accentGreen} />
              </View>
              <Text style={styles.successTitle}>Password Changed</Text>
              <Text style={styles.successText}>
                Your account password has been updated. You can now sign in using your new credentials.
              </Text>
              <Button
                label="Proceed to Login"
                onPress={handleProceedToLogin}
                variant="primary"
                style={styles.submitButton}
              />
            </View>
          ) : (
            <View style={styles.form}>
              {error && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={colors.accentRed} style={{ marginRight: spacing.xs }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                  />
                  <AppPressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textMuted} />
                    ) : (
                      <Eye size={18} color={colors.textMuted} />
                    )}
                  </AppPressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                  <AppPressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} color={colors.textMuted} />
                    ) : (
                      <Eye size={18} color={colors.textMuted} />
                    )}
                  </AppPressable>
                </View>
              </View>

              <Button
                label="Save New Password"
                onPress={handleUpdatePassword}
                loading={loading}
                variant="primary"
                style={styles.submitButton}
              />

              <AppPressable
                onPress={() => setIsPasswordRecovery(false)}
                style={styles.backButton}
              >
                <ArrowLeft size={16} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.backButtonText}>Back to Sign In</Text>
              </AppPressable>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.statusReceivedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.statusUrgentBg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentRed,
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    flex: 1,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.md,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  eyeButton: {
    padding: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  backButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.statusCompletedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  successTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  successText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
