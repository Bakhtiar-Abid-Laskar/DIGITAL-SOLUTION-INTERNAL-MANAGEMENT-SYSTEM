/**
 * Centralized Admin Chart & UI Color Constants
 *
 * SVG renderers (such as Recharts) cannot evaluate CSS `var(--...)` variables directly.
 * This module defines explicit Hex color values matching `globals.css` theme variables
 * for safe use in SVG charts, maps, and canvas elements.
 */

export const ADMIN_COLORS = {
  primary: '#5B4FE9',
  accent: '#3B82F6',
  accentDark: '#2563EB',
  
  // Status Colors (matching DB & design system tokens)
  received: '#3B82F6',        // Received / Pending (Blue)
  inProgress: '#8B5CF6',      // In Progress (Purple)
  waitingForMaterials: '#F59E0B', // Waiting for Materials / Warning (Amber)
  completed: '#10B981',       // Completed / Success (Green)
  urgent: '#EF4444',          // Urgent / Danger (Red)

  // System Text & BG Hexes
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  background: '#F9FAFB',
} as const;

export const CHART_STATUS_COLORS: Record<string, string> = {
  'Received': ADMIN_COLORS.received,
  'In Progress': ADMIN_COLORS.inProgress,
  'Waiting for Materials': ADMIN_COLORS.waitingForMaterials,
  'Completed': ADMIN_COLORS.completed,
};
