export type AppThemeMode = 'light' | 'dark';

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  secondary: string;
  secondarySoft: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  white: string;
  text: string;
  textMuted: string;
  textSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  border: string;
  overlay: string;
};

export const LIGHT_COLORS: ThemeColors = {
  primary: '#1E40AF',
  primaryDark: '#1D4ED8',
  primarySoft: '#DBEAFE',
  secondary: '#1E40AF',
  secondarySoft: '#DBEAFE',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#EFF6FF',
  white: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  textSoft: '#94A3B8',
  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  border: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.16)',
};

export const DARK_COLORS: ThemeColors = {
  primary: '#60A5FA',
  primaryDark: '#3B82F6',
  primarySoft: '#1E3A8A',
  secondary: '#60A5FA',
  secondarySoft: '#1E3A8A',
  background: '#0B1120',
  surface: '#111827',
  surfaceAlt: '#172554',
  white: '#FFFFFF',
  text: '#F8FAFC',
  textMuted: '#CBD5E1',
  textSoft: '#94A3B8',
  success: '#34D399',
  successSoft: '#064E3B',
  warning: '#FBBF24',
  warningSoft: '#78350F',
  danger: '#F87171',
  border: '#243244',
  overlay: 'rgba(2, 6, 23, 0.68)',
};

export const THEME_COLORS: Record<AppThemeMode, ThemeColors> = {
  dark: DARK_COLORS,
  light: LIGHT_COLORS,
};
