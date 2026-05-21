export interface KairosTheme {
  id: string;
  name: string;

  // Backgrounds
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;

  // Brand / accent
  primary: string;
  primaryMuted: string;
  primaryDim: string;
  secondary: string;
  secondaryMuted: string;

  // Semantic
  success: string;
  successMuted: string;
  warning: string;
  error: string;
  errorMuted: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Shadow tint
  shadowColor: string;
}

export const themes: Record<string, KairosTheme> = {
  morning_mint: {
    id: 'morning_mint',
    name: 'Morning Mint',

    bg:              '#EEF1DE',
    surface:         '#F1F0C8',
    surfaceElevated: '#E9ECCF',
    border:          '#C3C7A6',
    borderSubtle:    '#D7C59F44',

    primary:       '#7A9E7E',
    primaryMuted:  '#7A9E7E22',
    primaryDim:    '#5A7A5E',
    secondary:     '#B5986A',
    secondaryMuted:'#B5986A22',

    success:      '#5E9E6E',
    successMuted: '#5E9E6E20',
    warning:      '#C49A3C',
    error:        '#B05C4A',
    errorMuted:   '#B05C4A18',

    textPrimary:   '#2E3A2E',
    textSecondary: '#5A6B52',
    textTertiary:  '#8A9A80',
    textInverse:   '#EEF1DE',

    shadowColor: '#4A5E42',
  },

  ocean_milk: {
    id: 'ocean_milk',
    name: 'Ocean Milk',

    bg:              '#E2ECFB',
    surface:         '#E1EFEC',
    surfaceElevated: '#C4D6D4',
    border:          '#A8D1F0',
    borderSubtle:    '#B0D2D244',

    primary:       '#4A82B0',
    primaryMuted:  '#4A82B022',
    primaryDim:    '#2E5E8A',
    secondary:     '#5A9E9A',
    secondaryMuted:'#5A9E9A22',

    success:      '#4A9A7E',
    successMuted: '#4A9A7E20',
    warning:      '#C49A3C',
    error:        '#B05C6A',
    errorMuted:   '#B05C6A18',

    textPrimary:   '#1E2E3E',
    textSecondary: '#3A5A72',
    textTertiary:  '#6A8A9E',
    textInverse:   '#E2ECFB',

    shadowColor: '#2A4A62',
  },

  matcha_strawberry: {
    id: 'matcha_strawberry',
    name: 'Matcha Strawberry',

    bg:              '#ECE3D2',
    surface:         '#FCEBF1',
    surfaceElevated: '#F4C7D0',
    border:          '#D7DAB3',
    borderSubtle:    '#9FAA7444',

    primary:       '#C66F80',
    primaryMuted:  '#C66F8022',
    primaryDim:    '#A04A5A',
    secondary:     '#4A6644',
    secondaryMuted:'#4A664422',

    success:      '#6A8A4A',
    successMuted: '#6A8A4A20',
    warning:      '#C49A3C',
    error:        '#B04A4A',
    errorMuted:   '#B04A4A18',

    textPrimary:   '#2E1E22',
    textSecondary: '#6A3A44',
    textTertiary:  '#9A7A82',
    textInverse:   '#ECE3D2',

    shadowColor: '#6A2A3A',
  },

  honey_butter: {
    id: 'honey_butter',
    name: 'Honey Butter',

    bg:              '#FAF4E6',
    surface:         '#F8EED6',
    surfaceElevated: '#F2E6C0',
    border:          '#EAD3A5',
    borderSubtle:    '#F4DA9D44',

    primary:       '#C49A3C',
    primaryMuted:  '#C49A3C22',
    primaryDim:    '#9A7A1E',
    secondary:     '#A07850',
    secondaryMuted:'#A0785022',

    success:      '#7A9A4A',
    successMuted: '#7A9A4A20',
    warning:      '#E0A020',
    error:        '#B05A3A',
    errorMuted:   '#B05A3A18',

    textPrimary:   '#2E2010',
    textSecondary: '#6A4E28',
    textTertiary:  '#9A7E52',
    textInverse:   '#FAF4E6',

    shadowColor: '#6A4A18',
  },

  cherry_cola: {
    id: 'cherry_cola',
    name: 'Cherry Cola',

    bg:              '#F5EDE9',
    surface:         '#EDE0DA',
    surfaceElevated: '#E2B8AD',
    border:          '#CFA195',
    borderSubtle:    '#C6B8AB44',

    primary:       '#87564B',
    primaryMuted:  '#87564B22',
    primaryDim:    '#6D322A',
    secondary:     '#A59383',
    secondaryMuted:'#A5938322',

    success:      '#6A7A5A',
    successMuted: '#6A7A5A20',
    warning:      '#B07A3A',
    error:        '#8A2A2A',
    errorMuted:   '#8A2A2A18',

    textPrimary:   '#2A1210',
    textSecondary: '#6A3A30',
    textTertiary:  '#9A7A70',
    textInverse:   '#F5EDE9',

    shadowColor: '#5A1E18',
  },

  sunset_field: {
    id: 'sunset_field',
    name: 'Sunset Field',

    bg:              '#ECDCD1',
    surface:         '#E8D0DC',
    surfaceElevated: '#CEB6C0',
    border:          '#BFB7D4',
    borderSubtle:    '#A9AC8344',

    primary:       '#5B6A57',
    primaryMuted:  '#5B6A5722',
    primaryDim:    '#3A4A38',
    secondary:     '#BB998B',
    secondaryMuted:'#BB998B22',

    success:      '#6A8A5A',
    successMuted: '#6A8A5A20',
    warning:      '#B08A3A',
    error:        '#8A3A4A',
    errorMuted:   '#8A3A4A18',

    textPrimary:   '#1E1A22',
    textSecondary: '#4A3A50',
    textTertiary:  '#7A6A80',
    textInverse:   '#ECDCD1',

    shadowColor: '#3A2A40',
  },
};

export const DEFAULT_THEME_ID = 'morning_mint';
export const themeList = Object.values(themes);