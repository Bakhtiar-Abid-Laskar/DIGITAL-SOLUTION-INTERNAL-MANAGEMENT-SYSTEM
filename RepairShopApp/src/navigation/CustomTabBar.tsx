import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { AppPressable } from '../components/common/AppPressable';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  Wrench,
  Plus,
  Users,
  BarChart3,
  Package,
  Menu,
  Edit3,
  Banknote,
} from 'lucide-react-native';
import { colors, FLAT_TAB_HEIGHT, shadow } from '../tokens';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Icon map — route name → Lucide icon
// ---------------------------------------------------------------------------
const ICONS: Record<string, React.ElementType> = {
  Dashboard:     LayoutDashboard,
  Overview:      LayoutDashboard,
  Jobs:          ClipboardList,
  'My Jobs':     Wrench,
  Attendance:    CalendarCheck,
  'New Job':     Plus,
  'Add':         Plus,
  'Update Work': Edit3,
  Users:         Users,
  Customers:     Users,
  Reports:       BarChart3,
  Inventory:     Package,
  More:          Menu,
  Salary:        Banknote,
  Payments:      Banknote,
};

// Route names that render as the center FAB instead of a normal tab
const FAB_ROUTES = new Set(['New Job', 'Add']);

const TAB_BAR_HEIGHT = FLAT_TAB_HEIGHT; // internal sizing constant

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { role } = useAuth();

  // Role-specific accent color for the active tab
  let activeColor = colors.primary;
  if (role === 'technician') activeColor = colors.accentGreen;
  else if (role === 'admin')  activeColor = colors.accentBlue;

  // Safe-area bottom padding baked directly into the bar
  const safeBottom = insets.bottom;

  return (
    <View style={[styles.bar, { paddingBottom: safeBottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? String(options.tabBarLabel)
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;
        const isFab = FAB_ROUTES.has(route.name);



        const Icon = ICONS[route.name] ?? ClipboardList;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          // For FAB routes: the tab listener (in ReceptionistTabs / AdminTabs)
          // calls e.preventDefault() and shows the bottom sheet.
          // We must NOT guard on isFocused here — the listener fires regardless.
          if (!isFab && !isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params as any);
          }
        };

        // ── Center FAB ────────────────────────────────────────────────────
        if (isFab) {
          return (
            <View key={route.key} style={styles.fabSlot}>
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={onPress}
                style={[styles.fab, { backgroundColor: activeColor }]}
                activeOpacity={0.85}
              >
                <Icon size={26} color={colors.textInverse} strokeWidth={2.5} />
              </AppPressable>
            </View>
          );
        }

        // ── Regular tab item ──────────────────────────────────────────────
        const iconColor  = isFocused ? activeColor : colors.textMuted;
        const labelColor = isFocused ? activeColor : colors.textMuted;

        return (
          <AppPressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? `Navigate to ${label}`}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Icon size={22} color={iconColor} strokeWidth={isFocused ? 2.5 : 2} />
            <Text style={[styles.tabLabel, { color: labelColor }]} numberOfLines={1}>
              {label}
            </Text>
          </AppPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: FLAT_TAB_HEIGHT,
    // Platform-specific elevation so the bar sits cleanly above screen content
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    flex: 1,
    height: FLAT_TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  // The FAB slot takes the same flex-1 space as a regular tab so layout stays symmetric
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Raise just the button above the bar's top edge — does NOT overlap page content
    // because the bar itself is position:relative at the bottom
    paddingBottom: 4,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    // Slight upward lift within the bar — sits at bar top edge only
    marginTop: -18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
