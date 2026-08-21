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
  // Canvas
  background: '#FFFFFF',
  backgroundAlt: '#F9FAFB', // subtle gray if needed, but primarily white canvas
  surface: '#FFFFFF',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Status pastels & inks
  statusReceivedBg: '#E0ECFF',   // pastel.sky
  statusReceivedFg: '#3B5BFF',   // accent.blue
  statusInProgressBg: '#EDE9FE', // pastel.lavender
  statusInProgressFg: '#5B4FE9', // primary.violet
  statusCompletedBg: '#DCFCE7',  // pastel.mint
  statusCompletedFg: '#2E9E52',  // accent.green
  statusWaitingBg: '#FFEDD5',    // pastel.peach / amber
  statusWaitingFg: '#F5A524',    // accent.orange
  statusAssignedBg: '#F3F4F6',   // gray
  statusAssignedFg: '#6B7280',   // text.secondary
  statusUrgentBg: '#FEE2E2',     // pastel.rose
  statusUrgentFg: '#E5484D',     // accent.red
  statusHighBg: '#FFEDD5',       // pastel.peach
  statusHighFg: '#F5A524',       // accent.orange
  statusNormalBg: '#F3F4F6',     // gray/neutral
  statusNormalFg: '#6B7280',     // gray

  // Primary brand / accents
  primary: '#5B4FE9',
  accentBlue: '#3B5BFF',
  accentGreen: '#2E9E52',
  accentRed: '#E5484D',
  accentOrange: '#F5A524',

  // Digital Solution Brand Tokens
  brand: {
    navyDark: '#0A1A3A',             // header gradient start (top-left)
    blueBright: '#1E56CC',           // header gradient end (bottom-right), primary accent
    blueDeep: '#16233F',             // "DIGITAL" wordmark, "Welcome Back!" text
    blueAccent: '#1E56CC',           // "SOLUTION" wordmark, links, checkbox, icon glyphs
    buttonGradientStart: '#14337A',  // login button gradient start
    buttonGradientEnd: '#1E70E0',    // login button gradient end
  },
  surfaceCard: '#FFFFFF',
  surfaceInputBg: '#F3F5F9',         // pill-shaped input backgrounds
  surfaceIconChip: '#EAF1FF',        // light blue chip behind each service icon
  borderSubtle: '#E7EAF0',           // subtle borders
  brandTextSecondary: '#8A94A6',     // subtitle, placeholder, service labels

  // Nav
  navBackground: '#1C1C1E',
  navActive: '#3B5BFF',
  navInactive: '#8A8A8E',
  navTextInverse: '#FFFFFF',

  // Borders / dividers
  border: '#F1F1F4',

  // Feedback
  success: '#2E9E52',
  error: '#E5484D',
  warning: '#F5A524',

  statusPendingBg: '#E0ECFF',
  statusPendingFg: '#3B5BFF',

  // Salary badge specific
  warningAmber: '#ca8a04',
  warningAmberBg: '#fef9c3',

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
  md: 14, 
  lg: 18, 
  pill: 999,
  card: 14,
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
