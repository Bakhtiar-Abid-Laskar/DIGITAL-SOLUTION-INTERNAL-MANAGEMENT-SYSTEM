import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  Monitor,
  Camera,
  Network,
  Fingerprint,
  Package,
  AlertCircle,
} from 'lucide-react-native';

import { supabase } from '../../lib/supabase';
import { fetchUserRow } from '../../lib/auth';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { AppPressable } from '../../components/common/AppPressable';
import { getLastLoginInfo, saveLastLoginInfo } from '../../utils/rememberMe';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 5 Brand Service Categories
const SERVICES = [
  {
    id: 'computer',
    label: 'Computer\nSales & Service',
    Icon: Monitor,
  },
  {
    id: 'cctv',
    label: 'CCTV\nSales & Service',
    Icon: Camera,
  },
  {
    id: 'networking',
    label: 'Networking\nService',
    Icon: Network,
  },
  {
    id: 'biometric',
    label: 'Biometric\nSales & Service',
    Icon: Fingerprint,
  },
  {
    id: 'it_products',
    label: 'IT Products\nSales & Service',
    Icon: Package,
  },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic greeting state
  const [firstName, setFirstName] = useState<string | null>(null);

  // Focus animation states
  const emailBorder = useSharedValue(colors.borderSubtle);
  const passBorder = useSharedValue(colors.borderSubtle);
  const shakeTranslateX = useSharedValue(0);

  // Load saved user info on mount
  useEffect(() => {
    async function loadSavedData() {
      const info = await getLastLoginInfo();
      if (info) {
        if (info.email && info.rememberMe) {
          setEmail(info.email);
          setRememberMe(true);
        }
        if (info.firstName) {
          setFirstName(info.firstName);
        }
      }
    }
    loadSavedData();
  }, []);

  const triggerErrorShake = (message: string) => {
    setErrorMessage(message);
    shakeTranslateX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withRepeat(withTiming(10, { duration: 80 }), 3, true),
      withTiming(0, { duration: 60 })
    );
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      triggerErrorShake('Please enter both username/email and password.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      // 1. Supabase Auth Sign-In
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('invalid login credentials')) {
          triggerErrorShake('Invalid email or password. Please try again.');
        } else if (signInError.message.toLowerCase().includes('email not confirmed')) {
          triggerErrorShake('Account email not verified. Please contact admin.');
        } else {
          triggerErrorShake(signInError.message);
        }
        return;
      }

      if (!data.user) {
        triggerErrorShake('Login failed. Please try again.');
        return;
      }

      // 2. Fetch User Profile to confirm role and first name
      const userRow = await fetchUserRow(data.user.id);

      if (!userRow) {
        triggerErrorShake("We couldn't determine your account type — please contact admin.");
        await supabase.auth.signOut();
        return;
      }

      if (!userRow.is_active) {
        // Inactive account — handled by RootNavigator/InactiveUserScreen
        return;
      }

      // 3. Extract First Name & Update Database Login Timestamp
      const extractedFirstName = userRow.name?.trim().split(' ')[0] || '';
      
      // Update last_login_at in database
      try {
        await supabase.rpc('record_user_login');
      } catch {
        await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);
      }

      // 4. Save to Remember Me storage
      await saveLastLoginInfo({
        email: trimmedEmail,
        firstName: extractedFirstName,
        rememberMe,
      });

      // Successful login! RootNavigator will automatically route to the corresponding dashboard stack.
    } catch (err: any) {
      console.error('[Login] Exception during sign in:', err);
      triggerErrorShake('A network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Linking.openURL('mailto:support@digitalsolution.com?subject=Password%20Reset%20Request').catch(() => {
      triggerErrorShake('Please contact admin at support@digitalsolution.com');
    });
  };

  const handleContactAdmin = () => {
    Linking.openURL('mailto:admin@digitalsolution.com?subject=Account%20Inquiry').catch(() => {
      triggerErrorShake('Please email admin@digitalsolution.com for assistance.');
    });
  };

  // Focus border animated styles
  const emailInputAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: emailBorder.value,
  }));

  const passInputAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: passBorder.value,
  }));

  const cardShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  // Greeting title evaluation per Section 4
  const greetingHeadline = firstName ? `Welcome, ${firstName}!` : 'Welcome Back!';

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ─── HEADER PANEL (Gradient + Circuit SVG + Logo Lockup) ─── */}
        <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top + 16, 44) }]}>
          <LinearGradient
            colors={[colors.brand.navyDark, colors.brand.blueBright]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Decorative Circuit Board Vector Overlay */}
          <View style={styles.circuitSvgOverlay} pointerEvents="none">
            <Svg width="100%" height="100%" viewBox="0 0 400 240">
              <Path
                d="M 10 30 L 70 30 L 110 70 L 170 70 M 240 40 L 290 40 L 330 80 L 390 80 M 30 160 L 80 160 L 120 120 L 190 120 M 260 170 L 310 170 L 350 130 L 390 130"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1.5"
                fill="none"
              />
              <Circle cx="170" cy="70" r="3.5" fill="rgba(255, 255, 255, 0.25)" />
              <Circle cx="390" cy="80" r="3.5" fill="rgba(255, 255, 255, 0.25)" />
              <Circle cx="30" cy="160" r="3.5" fill="rgba(255, 255, 255, 0.25)" />
              <Circle cx="190" cy="120" r="3.5" fill="rgba(255, 255, 255, 0.25)" />
              <Circle cx="260" cy="170" r="3.5" fill="rgba(255, 255, 255, 0.25)" />
              <Line x1="110" y1="70" x2="110" y2="100" stroke="rgba(255, 255, 255, 0.10)" strokeWidth="1" />
              <Line x1="330" y1="80" x2="330" y2="110" stroke="rgba(255, 255, 255, 0.10)" strokeWidth="1" />
            </Svg>
          </View>

          {/* Logo Lockup */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.logoLockupContainer}>
            <View style={styles.logoBadge}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Wordmark: DIGITAL SOLUTION */}
            <View style={styles.wordmarkRow}>
              <Text style={styles.wordmarkDigital}>DIGITAL </Text>
              <Text style={styles.wordmarkSolution}>SOLUTION</Text>
            </View>

            {/* Tagline */}
            <View style={styles.taglineRow}>
              <View style={styles.taglineDivider} />
              <Text style={styles.taglineText}>SMART SOLUTION FOR A DIGITAL FUTURE</Text>
              <View style={styles.taglineDivider} />
            </View>
          </Animated.View>
        </View>

        {/* ─── CARD PANEL (White, Rounded Top, Elevated) ─── */}
        <Animated.View
          entering={FadeInDown.duration(450)}
          style={[styles.cardPanel, cardShakeStyle, { paddingBottom: Math.max(insets.bottom + 20, 32) }]}
        >
          {/* Greeting Block */}
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingTitle}>{greetingHeadline}</Text>
            <Text style={styles.greetingSubtitle}>Login to continue to your account</Text>
          </View>

          {/* Service Category Chip Row (5 Services) */}
          <View style={styles.serviceRowContainer}>
            {SERVICES.map((item) => {
              const ServiceIcon = item.Icon;
              return (
                <View key={item.id} style={styles.serviceChipItem}>
                  <View style={styles.serviceIconChip}>
                    <ServiceIcon size={20} color={colors.brand.blueAccent} strokeWidth={2} />
                  </View>
                  <Text style={styles.serviceChipLabel} numberOfLines={2}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Error Message Box */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color={colors.error} style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* ─── FORM INPUTS ─── */}
          <View style={styles.formSection}>
            {/* Username / Email Input */}
            <Animated.View style={[styles.pillInputContainer, emailInputAnimatedStyle]}>
              <User size={18} color={colors.brandTextSecondary} style={styles.inputLeftIcon} />
              <TextInput
                style={styles.pillInput}
                placeholder="Username / Email"
                placeholderTextColor={colors.brandTextSecondary}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onFocus={() => {
                  emailBorder.value = withTiming(colors.brand.blueAccent, { duration: 150 });
                }}
                onBlur={() => {
                  emailBorder.value = withTiming(colors.borderSubtle, { duration: 150 });
                }}
                accessibilityLabel="Username or Email"
              />
            </Animated.View>

            {/* Password Input */}
            <Animated.View style={[styles.pillInputContainer, passInputAnimatedStyle]}>
              <Lock size={18} color={colors.brandTextSecondary} style={styles.inputLeftIcon} />
              <TextInput
                style={styles.pillInput}
                placeholder="Password"
                placeholderTextColor={colors.brandTextSecondary}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => {
                  passBorder.value = withTiming(colors.brand.blueAccent, { duration: 150 });
                }}
                onBlur={() => {
                  passBorder.value = withTiming(colors.borderSubtle, { duration: 150 });
                }}
                accessibilityLabel="Password"
              />
              <AppPressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.inputRightIconButton}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.brandTextSecondary} />
                ) : (
                  <Eye size={18} color={colors.brandTextSecondary} />
                )}
              </AppPressable>
            </Animated.View>

            {/* Row: Remember Me + Forgot Password */}
            <View style={styles.optionsRow}>
              <AppPressable
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
              >
                <View style={[styles.checkboxBox, rememberMe && styles.checkboxBoxChecked]}>
                  {rememberMe && <Check size={12} color={colors.textInverse} strokeWidth={3} />}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </AppPressable>

              <AppPressable onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </AppPressable>
            </View>

            {/* ─── LOGIN BUTTON (Gradient Fill) ─── */}
            <AppPressable
              onPress={handleLogin}
              disabled={loading}
              style={[
                styles.loginButtonWrapper,
                loading && styles.loginButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={[colors.brand.buttonGradientStart, colors.brand.buttonGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>LOGIN</Text>
                )}
              </LinearGradient>
            </AppPressable>
          </View>

          {/* ─── FOOTER (Contact Admin) ─── */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerNormalText}>Don't have an account? </Text>
            <AppPressable onPress={handleContactAdmin}>
              <Text style={styles.footerContactText}>Contact Admin</Text>
            </AppPressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.brand.navyDark,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.surfaceCard,
  },

  // ─── Header Styles ───
  headerWrapper: {
    minHeight: 250,
    backgroundColor: colors.brand.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 42,
    position: 'relative',
    overflow: 'hidden',
  },
  circuitSvgOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  logoLockupContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoBadge: {
    width: 86,
    height: 86,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadow.medium,
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkDigital: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 1.5,
  },
  wordmarkSolution: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 20,
    fontWeight: '800',
    color: colors.brand.blueAccent,
    letterSpacing: 1.5,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  taglineDivider: {
    width: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  taglineText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 1,
    marginHorizontal: 8,
  },

  // ─── Card Panel Styles ───
  cardPanel: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: spacing.xxl,
    paddingTop: 24,
    ...shadow.medium,
  },
  greetingContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  greetingTitle: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 22,
    fontWeight: '700',
    color: colors.brand.blueDeep,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    color: colors.brandTextSecondary,
  },

  // ─── Service Category Chips ───
  serviceRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
    paddingVertical: 4,
  },
  serviceChipItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  serviceIconChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceIconChip,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  serviceChipLabel: {
    fontFamily: typography.micro.fontFamily,
    fontSize: 8.5,
    fontWeight: '600',
    color: colors.brandTextSecondary,
    textAlign: 'center',
    lineHeight: 11,
  },

  // ─── Error Message ───
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.statusUrgentBg,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorIcon: {
    marginRight: spacing.xs,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
  },

  // ─── Form Section ───
  formSection: {
    marginBottom: spacing.lg,
  },
  pillInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceInputBg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.lg,
    height: 50,
    marginBottom: 14,
  },
  inputLeftIcon: {
    marginRight: spacing.sm,
  },
  pillInput: {
    flex: 1,
    height: '100%',
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.brand.blueDeep,
    paddingVertical: 0,
  },
  inputRightIconButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },

  // ─── Options Row ───
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 20,
    paddingHorizontal: spacing.xs,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.brand.blueAccent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginRight: spacing.xs + 2,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.brand.blueAccent,
  },
  rememberMeText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    color: colors.brandTextSecondary,
  },
  forgotPasswordText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.blueAccent,
  },

  // ─── Login Button ───
  loginButtonWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: 4,
    ...shadow.card,
  },
  loginButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  loginButtonText: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: 1.5,
  },

  // ─── Footer ───
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  footerNormalText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    color: colors.brandTextSecondary,
  },
  footerContactText: {
    fontFamily: typography.bodyBold.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.blueAccent,
  },
});
