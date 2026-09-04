import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// FONT FAMILY — Inter (loaded via @expo-google-fonts/inter in App entry)
// ---------------------------------------------------------------------------
const FONTS = {
  regular: 'Inter_400Regular',
  medium:  'Inter_500Medium',
  semibold:'Inter_600SemiBold',
  bold:    'Inter_700Bold',
};

// ---------------------------------------------------------------------------
// DESIGN SYSTEM TOKENS (Aligned with Forensic Audit)
// ---------------------------------------------------------------------------

export const colors = {
  // Canvas & Surfaces (Harmonized with Web Admin)
  background: '#F8FAFC',
  backgroundAlt: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceHover: '#E2E8F0',
  surfaceDark: '#0F172A',

  // Semantic Web Admin Aliases
  bgBase: '#F8FAFC',
  bgSurface: '#FFFFFF',
  bgSubtle: '#F1F5F9',
  bgHover: '#E2E8F0',
  bgDark: '#0F172A',

  // Text (High Contrast Slate Hierarchy)
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',

  // Status pastels & inks (Exact match with web admin badge tokens)
  statusReceivedBg: '#E0ECFF',
  statusReceivedFg: '#3B5BFF',
  statusInProgressBg: '#E0F2FE',
  statusInProgressFg: '#0284C7',
  statusCompletedBg: '#D1FAE5',
  statusCompletedFg: '#059669',
  statusWaitingBg: '#FEF3C7',
  statusWaitingFg: '#D97706',
  statusAssignedBg: '#F1F5F9',
  statusAssignedFg: '#475569',
  statusUrgentBg: '#FEE2E2',
  statusUrgentFg: '#DC2626',
  statusHighBg: '#FEF3C7',
  statusHighFg: '#D97706',
  statusNormalBg: '#F1F5F9',
  statusNormalFg: '#475569',
  statusPendingBg: '#FEF3C7',
  statusPendingFg: '#D97706',

  // Primary brand / accents (Harmonized)
  primary: '#4F46E5',
  accent: '#6366F1',
  accentDark: '#4338CA',
  accentBlue: '#3B5BFF',
  accentGreen: '#10B981',
  accentRed: '#EF4444',
  accentOrange: '#F59E0B',

  // Digital Solution Brand Tokens
  brand: {
    navyDark: '#0A1A3A',
    blueBright: '#1E56CC',
    blueDeep: '#16233F',
    blueAccent: '#1E56CC',
    buttonGradientStart: '#14337A',
    buttonGradientEnd: '#1E70E0',
  },
  surfaceCard: '#FFFFFF',
  surfaceInputBg: '#F1F5F9',
  surfaceIconChip: '#E0ECFF',
  borderSubtle: '#E2E8F0',
  brandTextSecondary: '#475569',

  // Nav
  navBackground: '#0F172A',
  navActive: '#4F46E5',
  navInactive: '#94A3B8',
  navTextInverse: '#FFFFFF',

  // Borders / dividers
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Feedback
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',

  // Salary badge specific
  warningAmber: '#D97706',
  warningAmberBg: '#FEF3C7',

  accentTeal: '#0D9488',
  accentTealDim: '#CCFBF1',
  accentLightPurple: '#A855F7',
  accentLightPurpleDim: '#F3E8FF',
};

export const QUICK_ACTION_COLORS = {
  blueTile: { bg: colors.statusReceivedBg, fg: colors.accentBlue },
  purpleTile: { bg: colors.statusInProgressBg, fg: colors.primary },
  redTile: { bg: colors.statusUrgentBg, fg: colors.accentRed },
  tealTile: { bg: colors.accentTealDim, fg: colors.accentTeal },
  orangeTile: { bg: colors.statusWaitingBg, fg: colors.accentOrange },
  lightPurpleTile: { bg: colors.accentLightPurpleDim, fg: colors.accentLightPurple },
  grayTile: { bg: colors.statusNormalBg, fg: colors.textSecondary },
  greenTile: { bg: colors.statusCompletedBg, fg: colors.accentGreen },
};

export const spacing = { 
  xxs: 2,
  xs: 4, 
  sm: 8, 
  md: 12, 
  lg: 16, 
  xl: 20, 
  xxl: 24,
  xxxl: 32,
  base: 16,
};

export const radius = { 
  sm: 8, 
  md: 10, 
  lg: 14, 
  pill: 999,
  card: 12,
  sheet: 20,
};

export const typography = {
  display: { fontFamily: 'Inter_700Bold',   fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h1:      { fontFamily: 'Inter_700Bold',   fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h2:      { fontFamily: 'Inter_700Bold',   fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  h3:      { fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body:    { fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyMedium: { fontFamily: 'Inter_500Medium', fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  bodyBold: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label:   { fontFamily: 'Inter_600SemiBold', fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  micro:   { fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '400' as const, lineHeight: 14 },
  stat:    { fontFamily: 'Inter_700Bold',   fontSize: 24, fontWeight: '700' as const, lineHeight: 30 },
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  nav: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  fab: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  }
};

export const kpiAccents = {
  total:     { fill: colors.statusReceivedBg,    ink: colors.statusReceivedFg,    stripe: colors.accentBlue   },
  progress:  { fill: colors.statusInProgressBg,  ink: colors.statusInProgressFg,  stripe: colors.primary      },
  completed: { fill: colors.statusCompletedBg,   ink: colors.statusCompletedFg,   stripe: colors.accentGreen  },
  urgent:    { fill: colors.statusUrgentBg,       ink: colors.statusUrgentFg,      stripe: colors.accentRed    },
};

export const SPRING = {
  damping: 16,
  stiffness: 160,
  mass: 1.0,
  overshootClamping: true,
};

// ---------------------------------------------------------------------------
// TAB BAR & CLEARANCE
// ---------------------------------------------------------------------------
export const FLAT_TAB_HEIGHT = 60;
const NAV_PILL_HEIGHT = FLAT_TAB_HEIGHT;
export const BOTTOM_TAB_HEIGHT = FLAT_TAB_HEIGHT;
const NAV_CLEARANCE = 120;

const ANIM = {
  duration_fast: 150,
  duration_standard: 250,
  duration_slow: 400,
  easing_spring: SPRING,
};

// ---------------------------------------------------------------------------
// STATUS / PRIORITY CARD HELPER
// ---------------------------------------------------------------------------
export type JobStatusKey = 'Received' | 'In Progress' | 'Waiting for Materials' | 'Completed' | 'Assigned';

export const STATUS_CARD: Record<JobStatusKey, { fill: string; ink: string }> = {
  'Received':              { fill: colors.statusReceivedBg,   ink: colors.statusReceivedFg   },
  'In Progress':           { fill: colors.statusInProgressBg, ink: colors.statusInProgressFg },
  'Waiting for Materials': { fill: colors.statusWaitingBg,    ink: colors.statusWaitingFg    },
  'Completed':             { fill: colors.statusCompletedBg,  ink: colors.statusCompletedFg  },
  'Assigned':              { fill: colors.statusAssignedBg,   ink: colors.statusAssignedFg   },
};

export function getStatusCard(status: string): { fill: string; ink: string } {
  return STATUS_CARD[status as JobStatusKey] ?? STATUS_CARD['Received'];
}

export type JobPriorityKey = 'Normal' | 'High' | 'Urgent';

export const PRIORITY_CARD: Record<JobPriorityKey, { fill: string; ink: string }> = {
  'Normal': { fill: colors.statusNormalBg, ink: colors.statusNormalFg },
  'High':   { fill: colors.statusHighBg,   ink: colors.statusHighFg   },
  'Urgent': { fill: colors.statusUrgentBg, ink: colors.statusUrgentFg },
};

export function getPriorityCard(priority: string): { fill: string; ink: string } {
  return PRIORITY_CARD[priority as JobPriorityKey] ?? PRIORITY_CARD['Normal'];
}
