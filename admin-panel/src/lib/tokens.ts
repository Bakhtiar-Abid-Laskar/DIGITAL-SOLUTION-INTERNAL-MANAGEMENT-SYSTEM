export const ADMIN = {
  // Backgrounds
  bg_base:        '#F8F9FB',   // off-white base — not pure white, easier on eyes
  bg_surface:     '#FFFFFF',   // cards, panels
  bg_subtle:      '#F1F3F7',   // sidebar, table alternating rows
  bg_hover:       '#EEF2FF',   // row hover states

  // Brand / Accent
  accent:         '#3B6FF0',   // royal blue — admin authority color
  accent_dim:     '#3B6FF012', // blue at 7% — badge backgrounds
  accent_dark:    '#2D5FD4',   // pressed state

  // Semantic status (same meaning, lighter on white background)
  status_received:  { bg: '#F3F4F6', text: '#374151' },
  status_progress:  { bg: '#DBEAFE', text: '#1D4ED8' },
  status_waiting:   { bg: '#FEF3C7', text: '#92400E' },
  status_complete:  { bg: '#D1FAE5', text: '#065F46' },

  // Priority (pill styles)
  priority_normal: { bg: '#F3F4F6', text: '#374151' },
  priority_high:   { bg: '#FEF3C7', text: '#92400E' },
  priority_urgent: { bg: '#FEE2E2', text: '#991B1B' },

  // Typography
  text_primary:   '#0F172A',
  text_secondary: '#475569',
  text_muted:     '#94A3B8',

  // UI elements
  border:         '#E2E8F0',
  border_strong:  '#CBD5E1',
  sidebar_bg:     '#0F172A',   // dark sidebar on light body — deliberate contrast
  sidebar_text:   '#94A3B8',
  sidebar_active: '#FFFFFF',
  sidebar_active_bg: '#3B6FF020',

  // Destructive
  danger:         '#DC2626',
  danger_dim:     '#FEE2E2',
} as const;
