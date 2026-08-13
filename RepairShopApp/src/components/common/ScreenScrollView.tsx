import React from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';

interface ScreenScrollViewProps extends ScrollViewProps {
  /**
   * Extra bottom padding on top of the automatic tab-bar clearance.
   * Useful for screens with a fixed action bar above the tab bar.
   */
  extraBottomPadding?: number;
  /**
   * Set to 'nav_actions' if the screen has a fixed action button strip
   * above the tab bar (e.g. a "Save" footer). This increases the bottom
   * clearance automatically.
   */
  mode?: 'nav' | 'nav_actions';
}

/**
 * Drop-in replacement for ScrollView that automatically applies the correct
 * bottom content padding so nothing is ever hidden behind the fixed tab bar.
 *
 * Usage:
 *   <ScreenScrollView>
 *     {children}
 *   </ScreenScrollView>
 *
 * With a fixed action bar above the tab bar:
 *   <ScreenScrollView mode="nav_actions">
 *     {children}
 *   </ScreenScrollView>
 */
export default function ScreenScrollView({
  children,
  contentContainerStyle,
  extraBottomPadding = 0,
  mode = 'nav',
  ...rest
}: ScreenScrollViewProps) {
  const bottomPadding = useBottomInsetPadding(mode);

  const mergedContentStyle: StyleProp<ViewStyle> = [
    styles.defaultContent,
    contentContainerStyle,
    { paddingBottom: bottomPadding + extraBottomPadding },
  ];

  return (
    <ScrollView
      contentContainerStyle={mergedContentStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  defaultContent: {
    flexGrow: 1,
  },
});
