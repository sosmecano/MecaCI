import { Platform } from 'react-native';

export const Colors = {
  primary: '#725c00',
  onPrimary: '#ffffff',
  primaryContainer: '#ffd100',
  onPrimaryContainer: '#6f5a00',
  inversePrimary: '#edc200',

  secondary: '#0058bc',
  onSecondary: '#ffffff',
  secondaryContainer: '#0070eb',
  onSecondaryContainer: '#fefcff',

  tertiary: '#006972',
  onTertiary: '#ffffff',
  tertiaryContainer: '#0bebff',
  onTertiaryContainer: '#006670',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  surface: '#fff8f0',
  surfaceDim: '#e2d9c7',
  surfaceBright: '#fff8f0',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#fcf3e0',
  surfaceContainer: '#f6eddb',
  surfaceContainerHigh: '#f0e7d5',
  surfaceContainerHighest: '#ebe2cf',
  onSurface: '#1f1b10',
  onSurfaceVariant: '#4d4632',

  inverseSurface: '#353024',
  inverseOnSurface: '#f9f0dd',

  outline: '#7f765f',
  outlineVariant: '#d1c6ab',

  background: '#fff8f0',
  onBackground: '#1f1b10',
  surfaceVariant: '#ebe2cf',

  black: '#1f1b10',
  white: '#ffffff',
  sos: '#ba1a1a',
  success: '#34C759',

  // Legacy aliases
  mediumGray: '#4d4632',
  darkGray: '#1f1b10',
  textSecondary: '#4d4632',
  textTertiary: '#7f765f',
  text: '#1f1b10',
  lightGray: '#f0e7d5',
  border: '#d1c6ab',
  primaryDark: '#6f5a00',
};

export const Spacing = {
  base: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  safeMargin: 20,
  sheetMaxWidth: 500,
};

export const FontSize = {
  headlineLg: 28,
  titleMd: 24,
  subheadSm: 18,
  bodyBase: 16,
  bodySm: 14,
  caption: 12,

  // Legacy aliases
  largeTitle: 28,
  title: 24,
  subtitle: 18,
  body: 16,
  small: 14,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};

export const BorderRadius = {
  sm: 4,
  DEFAULT: 4,
  md: 8,
  lg: 12,
  xl: 12,
  full: 9999,
};

export const Typography = {
  headlineLg: {
    fontFamily: 'Inter',
    fontSize: FontSize.headlineLg,
    fontWeight: FontWeight.extraBold as any,
    lineHeight: 34,
    letterSpacing: -0.02,
  },
  titleMd: {
    fontFamily: 'Inter',
    fontSize: FontSize.titleMd,
    fontWeight: FontWeight.bold as any,
    lineHeight: 32,
  },
  subheadSm: {
    fontFamily: 'Inter',
    fontSize: FontSize.subheadSm,
    fontWeight: FontWeight.bold as any,
    lineHeight: 24,
  },
  bodyBase: {
    fontFamily: 'Inter',
    fontSize: FontSize.bodyBase,
    fontWeight: FontWeight.medium as any,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: 'Inter',
    fontSize: FontSize.bodySm,
    fontWeight: FontWeight.medium as any,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Inter',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium as any,
    lineHeight: 16,
    letterSpacing: 0.01,
  },
};

export const Shadow = {
  sm: Platform.OS === 'ios'
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }
    : { elevation: 2 },
  md: Platform.OS === 'ios'
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }
    : { elevation: 4 },
  lg: Platform.OS === 'ios'
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
      }
    : { elevation: 8 },
  sheet: Platform.OS === 'ios'
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
      }
    : { elevation: 10 },
};

export const Glass = {
  background: 'rgba(255, 255, 255, 0.90)',
  blurIntensity: 24,
  border: 'rgba(255, 255, 255, 0.40)',
  sheetBorder: 'rgba(255, 255, 255, 0.20)',
};
