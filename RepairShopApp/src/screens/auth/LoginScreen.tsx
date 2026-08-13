import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, UserCog, Wrench, ChevronLeft } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  FadeInUp,
  FadeOutDown
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import Button from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

type RoleSelection = 'receptionist' | 'technician' | 'admin' | null;

const handleFocus = (sharedVal: any) => {
  sharedVal.value = withTiming(colors.textPrimary, { duration: 150 });
};
const handleBlur = (sharedVal: any) => {
  sharedVal.value = withTiming(colors.border, { duration: 150 });
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  
  const [state, setState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      selectedRole: null as RoleSelection,
      email: '',
      password: '',
      loading: false,
      showPassword: false,
    }
  );

  const { selectedRole, email, password, loading, showPassword } = state;

  // Animated states for focus borders
  const emailBorder = useSharedValue<string>(colors.border);
  const passBorder = useSharedValue<string>(colors.border);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast({ title: 'Error', message: 'Please enter both email and password.', type: 'error' });
      return;
    }
    setState({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        showToast({ title: 'Login Failed', message: error.message, type: 'error' });
      }
    } finally {
      setState({ loading: false });
    }
  };

  const emailStyle = useAnimatedStyle(() => ({ borderColor: emailBorder.value }));
  const passStyle = useAnimatedStyle(() => ({ borderColor: passBorder.value }));



  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        
        {!selectedRole ? (
          // Role Selection View
          <Animated.View entering={FadeInUp.duration(400)} exiting={FadeOutDown.duration(300)} style={styles.fullWidth}>
            <View style={styles.headerBlock}>
              <Image source={require('../../../assets/logo.webp')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Welcome</Text>
              <Text style={styles.subtitle}>Please select your role to continue</Text>
            </View>

            <View style={styles.rolesContainer}>
              <RoleCard 
                title="Receptionist"
                description="Manage customers, jobs and billing"
                icon={<UserCog size={24} color={colors.primary} />}
                bgColor={colors.statusInProgressBg}
                onPress={() => setState({ selectedRole: 'receptionist' })}
                delay={100}
              />
              <RoleCard 
                title="Technician"
                description="View assigned jobs and update status"
                icon={<Wrench size={24} color={colors.accentGreen} />}
                bgColor={colors.statusCompletedBg}
                onPress={() => setState({ selectedRole: 'technician' })}
                delay={200}
              />
              <RoleCard 
                title="Admin"
                description="Manage users, jobs, inventory and reports"
                icon={<ShieldCheck size={24} color={colors.accentBlue} />}
                bgColor={colors.statusReceivedBg}
                onPress={() => setState({ selectedRole: 'admin' })}
                delay={300}
              />
            </View>
          </Animated.View>
        ) : (
          // Login Form View
          <Animated.View entering={FadeInUp.duration(400)} exiting={FadeOutDown.duration(300)} style={styles.fullWidth}>
            <AppPressable 
              style={styles.backButton} 
              onPress={() => {
                setState({ selectedRole: null, email: '', password: '' });
              }}
            >
              <ChevronLeft size={20} color={colors.textSecondary} />
              <Text style={styles.backText}>Back to Roles</Text>
            </AppPressable>

            <View style={styles.headerBlock}>
              <Image source={require('../../../assets/logo.webp')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Sign In</Text>
              <Text style={styles.subtitle}>Log in as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}</Text>
            </View>

            <View style={styles.formArea}>
              <Text style={styles.inputLabel}>Email</Text>
              <Animated.View style={[styles.inputContainer, emailStyle]}>
                <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(val) => setState({ email: val })}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => handleFocus(emailBorder)}
                  onBlur={() => handleBlur(emailBorder)}
                  accessibilityLabel="Email address"
                />
              </Animated.View>

              <Text style={styles.inputLabel}>Password</Text>
              <Animated.View style={[styles.inputContainer, passStyle]}>
                <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(val) => setState({ password: val })}
                  secureTextEntry={!showPassword}
                  onFocus={() => handleFocus(passBorder)}
                  onBlur={() => handleBlur(passBorder)}
                  accessibilityLabel="Password"
                />
                <Pressable 
                  onPress={() => setState({ showPassword: !showPassword })}
                  style={styles.eyeBtn}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={colors.textMuted} />
                  ) : (
                    <Eye size={18} color={colors.textMuted} />
                  )}
                </Pressable>
              </Animated.View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.md }}>
                <AppPressable 
                  onPress={async () => {
                    if (!email) {
                      showToast({ title: 'Email Required', message: 'Please enter your email address to reset password.', type: 'info' });
                      return;
                    }
                    const { error } = await supabase.auth.resetPasswordForEmail(email);
                    if (error) {
                      showToast({ title: 'Error', message: error.message, type: 'error' });
                    } else {
                      showToast({ title: 'Password Reset', message: 'Password reset link sent to your email.', type: 'success' });
                    }
                  }}
                >
                  <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '600' }}>Forgot password?</Text>
                </AppPressable>
              </View>

              <Button
                label="Sign In"
                onPress={handleLogin}
                loading={loading}
                style={styles.submitBtn}
              />

              <Text style={styles.helpText}>Trouble signing in? Contact administrator</Text>
            </View>
          </Animated.View>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}

interface RoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  onPress: () => void;
  delay: number;
}

function RoleCard({ title, description, icon, bgColor, onPress, delay }: RoleCardProps) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400)}>
      <AppPressable 
        style={styles.roleCard} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.roleIconTile, { backgroundColor: bgColor }]}>
          {icon}
        </View>
        <View style={styles.roleTextContainer}>
          <Text style={styles.roleTitle}>{title}</Text>
          <Text style={styles.roleDesc}>{description}</Text>
        </View>
      </AppPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'flex-start', // Top-left alignment for header block
  },
  fullWidth: {
    width: '100%',
  },
  headerBlock: {
    marginBottom: spacing.xxxl,
    width: '100%',
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  rolesContainer: {
    width: '100%',
    gap: spacing.lg,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleIconTile: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  roleDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    alignSelf: 'flex-start',
    minHeight: 44,
    minWidth: 44,
  },
  backText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  formArea: {
    width: '100%',
  },
  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 52,
    marginBottom: spacing.lg,
  },
  inputIcon: {
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    height: '100%',
  },
  eyeBtn: {
    padding: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  helpText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  }
});
