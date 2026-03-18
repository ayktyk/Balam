// Balam tasarım sistemi — "Eski Mektup, Dijital Arşiv" atmosferi

export const COLORS = {
  cream: '#F5F0E8',
  creamDark: '#EDE7D9',
  ink: '#2C2416',
  inkLight: '#6B5B45',
  gold: '#C9A96E',
  goldLight: '#E8D5A3',
  warmWhite: '#FDFAF5',
  border: '#D4C5A9',
  capsule: '#8B7355',
  capsuleBg: '#F0E8D8',
  danger: '#C44B4B',
  success: '#5A8F5A',
} as const;

export const FONTS = {
  heading: 'PlayfairDisplay_700Bold',
  headingItalic: 'PlayfairDisplay_700Bold_Italic',
  body: 'Lora_400Regular',
  bodyBold: 'Lora_700Bold',
  bodyItalic: 'Lora_400Regular_Italic',
  ui: 'DMSans_400Regular',
  uiBold: 'DMSans_700Bold',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 20,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: 'rgba(44, 36, 22, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

export const ENTRY_ICONS = {
  letter: '✉️',
  memory: '📷',
  milestone: '🌟',
  voice: '🎙️',
  capsule: '📮',
} as const;
