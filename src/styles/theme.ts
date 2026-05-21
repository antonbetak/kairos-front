export const colors = {
  bg: '#EEF1DE',
  surface: '#F1F0C8',
  surfaceElevated: '#E9ECCF',
  border: '#C3C7A6',
  borderSubtle: '#D7C59F44',
  primary: '#7A9E7E',
  primaryMuted: '#7A9E7E22',
  primaryDim: '#5A7A5E',
  secondary: '#B5986A',
  secondaryMuted: '#B5986A22',
  success: '#5E9E6E',
  successMuted: '#5E9E6E20',
  warning: '#C49A3C',
  error: '#B05C4A',
  errorMuted: '#B05C4A18',
  textPrimary: '#2E3A2E',
  textSecondary: '#5A6B52',
  textTertiary: '#8A9A80',
  textInverse: '#EEF1DE',
};

export const typography = {
  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 38,

  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const makeShadows = (shadowColor: string) => ({
  sm: {
    shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  glow: {
    shadowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});