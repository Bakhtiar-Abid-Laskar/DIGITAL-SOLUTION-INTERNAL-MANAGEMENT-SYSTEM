import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { AppPressable } from './AppPressable';
import { ChevronLeft, Bell, MoreVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors, typography, shadow, spacing } from '../../tokens';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  leftIcon?: React.ReactNode;
  onLeftPress?: () => void;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
  /** isDashboard kept for backward compat — no visual difference in new design */
  isDashboard?: boolean;
  unreadCount?: number;
}

export default function AppHeader({
  title,
  showBack = false,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  isDashboard = false,
  unreadCount = 0,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role } = useAuth();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {showBack ? (
          <AppPressable
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={colors.textSecondary} />
          </AppPressable>
        ) : leftIcon ? (
          <AppPressable
            onPress={onLeftPress}
            style={styles.iconButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Header left action"
          >
            {leftIcon}
          </AppPressable>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}

        {title ? (
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        ) : (
          <View style={styles.brandTitleContainer}>
            <Image source={require('../../../assets/logo.webp')} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.brandTitle}>Digital Solution</Text>
          </View>
        )}

        {rightIcon ? (
          <AppPressable
            onPress={onRightPress}
            style={styles.iconButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Header action"
          >
            {rightIcon}
          </AppPressable>
        ) : isDashboard ? (
          <AppPressable
            onPress={onRightPress}
            style={styles.iconButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <View>
              <Bell size={22} color={colors.textSecondary} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  {unreadCount > 1 ? (
                   <Text style={[{...typography.micro}, {color: colors.textInverse, fontWeight: '700'}]}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  ) : null}
                </View>
              )}
            </View>
          </AppPressable>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  brandTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  headerLogo: {
    width: 26,
    height: 26,
  },
  brandTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPlaceholder: {
    width: 44,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accentRed,
    borderWidth: 1.5,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
});
