import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLAT_TAB_HEIGHT } from '../tokens';

/**
 * Returns the bottom padding that scroll content should apply so nothing
 * is hidden behind the fixed flat bottom tab bar.
 *
 * Formula: FLAT_TAB_HEIGHT + device safe-area bottom + 16px buffer
 *
 * @param mode
 *   - 'nav'         : Only the tab bar is present (default).
 *   - 'nav_actions' : Tab bar + a fixed action bar above it (e.g. form submit).
 *                     Adds ~88px for the action strip.
 */
export function useBottomInsetPadding(mode: 'nav' | 'nav_actions' = 'nav'): number {
  const insets = useSafeAreaInsets();
  // Base clearance: tab bar height + OS safe area + 16px breathing room
  const base = FLAT_TAB_HEIGHT + insets.bottom + 16;

  if (mode === 'nav_actions') {
    // Fixed action bar: button height(52) + paddingTop(12) + paddingBottom(12) ≈ 76
    return base + 76;
  }

  return base;
}
