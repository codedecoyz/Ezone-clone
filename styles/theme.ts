// Design System - Modern Indigo Theme (Matching reference design)

export const Colors = {
  // Primary Colors (Indigo)
  primary: '#4F46E5',
  primaryLight: '#6366F1',
  primaryMedium: '#818CF8',
  primaryLighter: '#A5B4FC',
  primaryLightest: '#E0E7FF',

  // Secondary (Teal)
  secondary: '#14B8A6',

  // Accent (Amber)
  accent: '#F59E0B',

  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Background Colors
  background: '#F8FAFC',
  backgroundGradientStart: '#E0E7FF',
  backgroundGradientEnd: '#C7D2FE',

  // Card Colors
  card: '#FFFFFF',
  cardShadow: 'rgba(79, 70, 229, 0.12)',

  // Text Colors
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',

  // Border Colors
  border: '#E2E8F0',
  borderFocus: '#4F46E5',

  // Attendance Status Colors
  present: '#10B981',
  absent: '#EF4444',
  late: '#F59E0B',
  excused: '#6B7280',

  // Surface
  surface: '#FFFFFF',

  // Other
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Typography = {
  fontFamily: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
  lineHeight: {
    xs: 16,
    sm: 18,
    base: 21,
    md: 24,
    lg: 26,
    xl: 30,
    xxl: 36,
    xxxl: 42,
  },
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const Gradients = {
  primary: ['#4F46E5', '#3B82F6'],
  header: ['#4F46E5', '#4338CA', '#3B82F6'],
  background: ['#E0E7FF', '#C7D2FE', '#A5B4FC'],
  progressBar: ['#4F46E5', '#6366F1'],
};

export const Theme = {
  colors: Colors,
  spacing: Spacing,
  borderRadius: BorderRadius,
  typography: Typography,
  shadows: Shadows,
  gradients: Gradients,
};

export type ThemeType = typeof Theme;

export default Theme;
