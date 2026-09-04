// ─── Nexora Design Token System ──────────────────────────────────────────────
// Single source of truth for all visual decisions in the app.
// Every component and screen imports from here — never hard-code values.

import { Platform } from 'react-native';


// ─── Color Palette ────────────────────────────────────────────────────────────
export const Colors = {
  // Backgrounds — layered dark surfaces for depth
  bg:             '#07090F',   // deepest background
  surface:        '#0F1422',   // card / panel surface
  surfaceAlt:     '#141929',   // slightly lighter surface
  surfaceElevated:'#1A2236',   // modals, elevated cards
  surfacePressed: '#1F2A42',   // pressed / active state

  // Borders
  border:         '#1E2B45',   // default border
  borderStrong:   '#2C3E5D',   // stronger separator

  // Text
  textPrimary:    '#F0F4FF',   // headings, important content
  textSecondary:  '#B8C4DC',   // body text
  textMuted:      '#6B7A99',   // placeholders, helper text
  textDisabled:   '#3A4660',   // disabled state

  // Brand — Indigo-Violet spectrum
  primary:        '#6366F1',   // primary brand accent
  primaryLight:   '#818CF8',   // lighter variant for dark bg
  primaryMuted:   '#312E81',   // very muted for backgrounds
  primarySubtle:  '#1E1B4B',   // extremely subtle bg tint

  // Semantic
  success:        '#22C55E',
  successMuted:   '#14532D',
  warning:        '#F59E0B',
  warningMuted:   '#451A03',
  error:          '#EF4444',
  errorMuted:     '#450A0A',
  info:           '#38BDF8',
  infoMuted:      '#0C2A3F',

  // Subject colors (for subject cards/accents)
  subjectColors: [
    '#6366F1', // indigo
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F59E0B', // amber
    '#10B981', // emerald
    '#3B82F6', // blue
    '#F97316', // orange
  ],

  // Pure
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ─── Spacing Scale ────────────────────────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  base:16,
  lg:  20,
  xl:  24,
  '2xl':32,
  '3xl':40,
  '4xl':48,
  '5xl':64,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl':24,
  '3xl':32,
  full: 9999,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const Typography = {
  // Font families (system fonts — no install needed)
  fontFamily: {
    regular: undefined,   // system default
    medium:  undefined,
    bold:    undefined,
  },

  // Font sizes
  size: {
    xs:    11,
    sm:    13,
    base:  15,
    md:    16,
    lg:    18,
    xl:    20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 34,
    '5xl': 42,
  },

  // Font weights (React Native uses string values)
  weight: {
    regular: '400' as const,
    medium:  '500' as const,
    semibold:'600' as const,
    bold:    '700' as const,
    black:   '800' as const,
  },

  // Line heights
  lineHeight: {
    tight:  1.2,
    normal: 1.5,
    relaxed:1.7,
  },

  // Letter spacing
  tracking: {
    tight:  -0.5,
    normal:  0,
    wide:    0.5,
    wider:   1,
    widest:  2,
  },
} as const;

// ─── Shadow Presets ───────────────────────────────────────────────────────────
// Platform.select: web uses CSS boxShadow, native uses shadow* props (no deprecation warnings)

export const Shadow = {
  sm: Platform.select({
    web: { boxShadow: '0 2px 8px rgba(0,0,0,0.18)' } as object,
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  })!,
  md: Platform.select({
    web: { boxShadow: '0 4px 16px rgba(0,0,0,0.28)' } as object,
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  })!,
  lg: Platform.select({
    web: { boxShadow: '0 8px 32px rgba(0,0,0,0.40)' } as object,
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.40,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  })!,
};

