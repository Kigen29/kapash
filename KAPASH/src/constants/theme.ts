// Kapash – Design System Tokens
// Derived from Figma: https://www.figma.com/design/uiwyjMjhSrZnzRvF66unwO/kapash

export const COLORS = {
  // ── Brand ─────────────────────────────────────────
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primaryLight: '#86EFAC',
  primaryBg: '#F0FDF4',
  primaryMuted: 'rgba(34,197,94,0.12)',

  // ── Surfaces ──────────────────────────────────────
  background: '#F6F6F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',

  // ── Dark (hero / cards) ───────────────────────────
  dark: '#0F1923',
  darkCard: '#1A2633',
  darkOverlay: 'rgba(15,25,35,0.72)',
  darkOverlayLight: 'rgba(15,25,35,0.35)',

  // ── Text ──────────────────────────────────────────
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  textGreen: '#16A34A',

  // ── Borders ───────────────────────────────────────
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // ── Status ────────────────────────────────────────
  success: '#22C55E',
  successBg: '#DCFCE7',
  pending: '#F59E0B',
  pendingBg: '#FEF3C7',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  info: '#3B82F6',
  infoBg: '#DBEAFE',

  // ── Utility ───────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.45)',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',

  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
};

export const FONT_WEIGHT: Record<string, '400' | '500' | '600' | '700' | '800'> = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const SHADOWS = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
  },
  green: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
};