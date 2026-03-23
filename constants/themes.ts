// Balam tema sistemi — 5 renk teması
// FONTS, SPACING, RADIUS, SHADOWS temadan bağımsızdır (theme.ts'de kalır)

export type ThemeColors = {
  cream: string;
  creamDark: string;
  ink: string;
  inkLight: string;
  gold: string;
  goldLight: string;
  warmWhite: string;
  border: string;
  capsule: string;
  capsuleBg: string;
  danger: string;
  success: string;
};

export type ThemeId = 'sicak' | 'gul' | 'okyanus' | 'orman' | 'gece';

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  emoji: string;
  colors: ThemeColors;
  statusBarStyle: 'dark' | 'light';
};

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  sicak: {
    id: 'sicak',
    name: 'Sicak',
    emoji: '🌾',
    statusBarStyle: 'dark',
    colors: {
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
    },
  },
  gul: {
    id: 'gul',
    name: 'Gul',
    emoji: '🌷',
    statusBarStyle: 'dark',
    colors: {
      cream: '#FBF0F0',
      creamDark: '#F3E4E4',
      ink: '#3A2028',
      inkLight: '#7A5A64',
      gold: '#D4918A',
      goldLight: '#F0C4BF',
      warmWhite: '#FFFAF9',
      border: '#E0C4C0',
      capsule: '#A0736E',
      capsuleBg: '#F5E8E6',
      danger: '#C44B4B',
      success: '#6B9A6B',
    },
  },
  okyanus: {
    id: 'okyanus',
    name: 'Okyanus',
    emoji: '🌊',
    statusBarStyle: 'dark',
    colors: {
      cream: '#EEF3F8',
      creamDark: '#E0E9F0',
      ink: '#1A2A3A',
      inkLight: '#4A6478',
      gold: '#5B8DB8',
      goldLight: '#A4C8E4',
      warmWhite: '#F8FAFC',
      border: '#BCCEDE',
      capsule: '#5A7A94',
      capsuleBg: '#E4EDF4',
      danger: '#C44B4B',
      success: '#5A8F6A',
    },
  },
  orman: {
    id: 'orman',
    name: 'Orman',
    emoji: '🌿',
    statusBarStyle: 'dark',
    colors: {
      cream: '#EFF3ED',
      creamDark: '#E0E8DC',
      ink: '#1E2B1E',
      inkLight: '#4A6148',
      gold: '#7A9E6E',
      goldLight: '#B4D0A8',
      warmWhite: '#F8FAF7',
      border: '#BBCDB5',
      capsule: '#5E7A56',
      capsuleBg: '#E4EDE0',
      danger: '#C44B4B',
      success: '#5A8F5A',
    },
  },
  gece: {
    id: 'gece',
    name: 'Gece',
    emoji: '🌙',
    statusBarStyle: 'light',
    colors: {
      cream: '#1A1A2E',
      creamDark: '#242440',
      ink: '#E8E4DC',
      inkLight: '#A09888',
      gold: '#D4A84B',
      goldLight: '#5C4A28',
      warmWhite: '#2A2A44',
      border: '#3A3A56',
      capsule: '#B89040',
      capsuleBg: '#22223A',
      danger: '#E06060',
      success: '#6BAF6B',
    },
  },
};

export const DEFAULT_THEME: ThemeId = 'sicak';
