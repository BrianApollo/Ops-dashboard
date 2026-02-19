/**
 * App Theme - Premium corporate design with dark/light mode support.
 *
 * Design philosophy:
 * - Corporate blue palette conveying trust and authority
 * - Tight, refined spacing with crisp edge definition
 * - Flat buttons, no gradients — enterprise aesthetic
 * - Multi-layer shadows inspired by Stripe/Linear
 * - DM Sans typeface for geometric premium feel
 */

import { createTheme, alpha, Theme } from '@mui/material/styles';

// =============================================================================
// COLOR PALETTE
// =============================================================================

// Primary accent - Corporate Blue
const primaryMain = '#1E40AF';
const primaryLight = '#2563EB';
const primaryDark = '#1E3A8A';

// Semantic colors - slightly deeper/desaturated for corporate feel
const successMain = '#059669';
const successLight = '#34D399';
const successDark = '#047857';

const warningMain = '#D97706';
const warningLight = '#FBBF24';
const warningDark = '#B45309';

const errorMain = '#DC2626';
const errorLight = '#F87171';
const errorDark = '#B91C1C';

const infoMain = '#2563EB';
const infoLight = '#60A5FA';
const infoDark = '#1D4ED8';

// =============================================================================
// LIGHT MODE PALETTE
// =============================================================================

const lightPalette = {
  mode: 'light' as const,
  primary: {
    main: primaryMain,
    light: primaryLight,
    dark: primaryDark,
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#0D9488',
    light: '#2DD4BF',
    dark: '#0F766E',
    contrastText: '#ffffff',
  },
  success: { main: successMain, light: successLight, dark: successDark },
  warning: { main: warningMain, light: warningLight, dark: warningDark },
  error: { main: errorMain, light: errorLight, dark: errorDark },
  info: { main: infoMain, light: infoLight, dark: infoDark },
  background: {
    default: '#FFFFFF',
    paper: '#FFFFFF',
  },
  divider: 'rgba(0, 0, 0, 0.08)',
  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    disabled: '#94A3B8',
  },
  action: {
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: alpha(primaryMain, 0.08),
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.04)',
    focus: alpha(primaryMain, 0.12),
  },
  grey: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
};

// =============================================================================
// DARK MODE PALETTE
// =============================================================================

const darkPalette = {
  mode: 'dark' as const,
  primary: {
    main: '#60A5FA',
    light: '#93C5FD',
    dark: '#3B82F6',
    contrastText: '#0F172A',
  },
  secondary: {
    main: '#2DD4BF',
    light: '#5EEAD4',
    dark: '#14B8A6',
    contrastText: '#0F172A',
  },
  success: { main: '#34D399', light: '#6EE7B7', dark: successMain },
  warning: { main: '#FBBF24', light: '#FCD34D', dark: warningMain },
  error: { main: '#F87171', light: '#FCA5A5', dark: errorMain },
  info: { main: '#60A5FA', light: '#93C5FD', dark: infoMain },
  background: {
    default: '#0B1120',
    paper: '#151E2E',
  },
  divider: 'rgba(255, 255, 255, 0.06)',
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    disabled: '#64748B',
  },
  action: {
    hover: 'rgba(255, 255, 255, 0.05)',
    selected: alpha('#60A5FA', 0.12),
    disabled: 'rgba(255, 255, 255, 0.26)',
    disabledBackground: 'rgba(255, 255, 255, 0.08)',
    focus: alpha('#60A5FA', 0.16),
  },
  grey: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
};

// =============================================================================
// TYPOGRAPHY
// =============================================================================

const typography = {
  fontFamily: [
    '"DM Sans"',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  fontSize: 14,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.03em' },
  h2: { fontSize: '1.625rem', fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.025em' },
  h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.02em' },
  h4: { fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.35, letterSpacing: '-0.01em' },
  h5: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.005em' },
  h6: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.5 },
  subtitle1: { fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.005em' },
  body1: { fontSize: '0.875rem', lineHeight: 1.6 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
  caption: { fontSize: '0.6875rem', lineHeight: 1.4, fontWeight: 500, letterSpacing: '0.01em' },
  overline: { fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const },
  button: { fontSize: '0.8125rem', fontWeight: 500, textTransform: 'none' as const, letterSpacing: '0.01em' },
};

// =============================================================================
// SHADOWS - Multi-layer system with crisp ring edges (Stripe-style)
// =============================================================================

const createShadows = (mode: 'light' | 'dark') => {
  if (mode === 'dark') {
    return [
      'none',
      '0 0 0 1px rgba(255,255,255,0.04)',
      '0 0 0 1px rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.3)',
      '0 0 0 1px rgba(255,255,255,0.03), 0 2px 4px rgba(0,0,0,0.3)',
      '0 0 0 1px rgba(255,255,255,0.03), 0 4px 8px rgba(0,0,0,0.3)',
      '0 0 0 1px rgba(255,255,255,0.03), 0 6px 12px rgba(0,0,0,0.35)',
      '0 0 0 1px rgba(255,255,255,0.02), 0 8px 16px rgba(0,0,0,0.35)',
      '0 0 0 1px rgba(255,255,255,0.02), 0 12px 24px rgba(0,0,0,0.4)',
      '0 0 0 1px rgba(255,255,255,0.02), 0 16px 32px rgba(0,0,0,0.4)',
      '0 0 0 1px rgba(255,255,255,0.02), 0 20px 40px rgba(0,0,0,0.45)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
      '0 24px 48px rgba(0,0,0,0.5)',
    ] as const;
  }

  return [
    'none',
    '0 0 0 1px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.04)',
    '0 0 0 1px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.06)',
    '0 0 0 1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04)',
    '0 0 0 1px rgba(0,0,0,0.02), 0 4px 8px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.04)',
    '0 0 0 1px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.06)',
    '0 0 0 1px rgba(0,0,0,0.02), 0 8px 16px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.06)',
    '0 0 0 1px rgba(0,0,0,0.02), 0 12px 24px rgba(0,0,0,0.08), 0 20px 40px rgba(0,0,0,0.06)',
    '0 16px 32px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.06)',
    '0 20px 40px rgba(0,0,0,0.1), 0 24px 48px rgba(0,0,0,0.08)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.12)',
  ] as const;
};

// =============================================================================
// COMPONENT OVERRIDES
// =============================================================================

const createComponentOverrides = (mode: 'light' | 'dark', palette: typeof lightPalette) => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: palette.background.default,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        transition: 'background-color 0.2s ease-in-out',
      },
      '*, *::before, *::after': {
        boxSizing: 'border-box',
      },
      '::-webkit-scrollbar': {
        width: 6,
        height: 6,
      },
      '::-webkit-scrollbar-track': {
        background: mode === 'dark' ? '#151E2E' : '#F1F5F9',
      },
      '::-webkit-scrollbar-thumb': {
        background: mode === 'dark' ? '#475569' : '#CBD5E1',
        borderRadius: 3,
        '&:hover': {
          background: mode === 'dark' ? '#64748B' : '#94A3B8',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        transition: 'background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      },
      outlined: {
        borderColor: palette.divider,
      },
    },
    defaultProps: {
      elevation: 0,
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        borderRadius: 8,
        border: `1px solid ${palette.divider}`,
      },
    },
    defaultProps: {
      elevation: 0,
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        fontWeight: 500,
        borderRadius: 6,
        padding: '8px 16px',
        transition: 'all 0.15s ease-in-out',
      },
      sizeSmall: {
        padding: '6px 14px',
        fontSize: '0.8125rem',
        borderRadius: 6,
      },
      sizeLarge: {
        padding: '12px 24px',
        fontSize: '1rem',
        borderRadius: 8,
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        },
      },
      containedPrimary: {
        background: palette.primary.main,
        '&:hover': {
          background: palette.primary.dark,
        },
      },
      outlined: {
        borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        color: palette.text.primary,
        '&:hover': {
          borderColor: palette.primary.main,
          backgroundColor: alpha(palette.primary.main, 0.04),
        },
      },
      text: {
        color: palette.text.secondary,
        '&:hover': {
          backgroundColor: palette.action.hover,
          color: palette.text.primary,
        },
      },
    },
    defaultProps: {
      disableElevation: true,
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        transition: 'all 0.15s ease-in-out',
        '&:hover': {
          backgroundColor: palette.action.hover,
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 500,
        borderRadius: 4,
        transition: 'all 0.15s ease-in-out',
      },
      sizeSmall: {
        height: 22,
        fontSize: '0.675rem',
      },
      sizeMedium: {
        height: 26,
        fontSize: '0.75rem',
      },
      outlined: {
        borderColor: palette.divider,
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      size: 'small' as const,
      variant: 'outlined' as const,
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        transition: 'all 0.15s ease-in-out',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderWidth: 1.5,
          borderColor: palette.primary.main,
          boxShadow: `0 0 0 3px ${alpha(palette.primary.main, 0.1)}`,
        },
      },
      input: {
        padding: '9px 12px',
      },
      inputSizeSmall: {
        padding: '7px 10px',
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      select: {
        borderRadius: 6,
      },
    },
  },
  MuiCheckbox: {
    styleOverrides: {
      root: {
        padding: 8,
        color: palette.text.disabled,
        '&.Mui-checked': {
          color: palette.primary.main,
        },
      },
    },
    defaultProps: {
      size: 'small' as const,
    },
  },
  MuiTableContainer: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        border: `1px solid ${palette.divider}`,
        overflow: 'hidden',
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-head': {
          backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
          fontWeight: 600,
          fontSize: '0.6875rem',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.06em',
          color: palette.text.secondary,
          borderBottom: `1px solid ${palette.divider}`,
        },
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        transition: 'background-color 0.1s ease-in-out',
        '&:hover': {
          backgroundColor: palette.action.hover,
        },
        '&.Mui-selected': {
          backgroundColor: alpha(palette.primary.main, mode === 'dark' ? 0.12 : 0.06),
          '&:hover': {
            backgroundColor: alpha(palette.primary.main, mode === 'dark' ? 0.16 : 0.1),
          },
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottomColor: palette.divider,
        padding: '12px 16px',
      },
      head: {
        padding: '10px 16px',
      },
    },
  },
  MuiTableSortLabel: {
    styleOverrides: {
      root: {
        '&.Mui-active': {
          color: palette.primary.main,
        },
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: 'none',
        backgroundColor: palette.background.paper,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
        border: mode === 'light' ? '1px solid rgba(0,0,0,0.06)' : 'none',
        boxShadow: mode === 'dark'
          ? '0 24px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)'
          : '0 16px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: palette.divider,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        margin: '2px 8px',
        transition: 'all 0.15s ease-in-out',
        '&.Mui-selected': {
          backgroundColor: alpha(palette.primary.main, mode === 'dark' ? 0.15 : 0.1),
          '&:hover': {
            backgroundColor: alpha(palette.primary.main, mode === 'dark' ? 0.2 : 0.15),
          },
        },
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        fontWeight: 500,
        fontSize: '0.8125rem',
        minHeight: 44,
        padding: '10px 16px',
        transition: 'all 0.15s ease-in-out',
        '&.Mui-selected': {
          color: palette.primary.main,
        },
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: {
        height: 2,
        borderRadius: '2px 2px 0 0',
        backgroundColor: palette.primary.main,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: mode === 'dark' ? '#334155' : '#1E293B',
        color: '#F1F5F9',
        fontSize: '0.6875rem',
        fontWeight: 500,
        padding: '5px 10px',
        borderRadius: 4,
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 3,
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      },
      bar: {
        borderRadius: 3,
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: {
        width: 44,
        height: 24,
        padding: 0,
      },
      switchBase: {
        padding: 2,
        '&.Mui-checked': {
          transform: 'translateX(20px)',
          color: '#fff',
          '& + .MuiSwitch-track': {
            backgroundColor: palette.primary.main,
            opacity: 1,
          },
        },
      },
      thumb: {
        width: 20,
        height: 20,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      },
      track: {
        borderRadius: 12,
        backgroundColor: mode === 'dark' ? '#475569' : '#CBD5E1',
        opacity: 1,
      },
    },
  },
});

// =============================================================================
// THEME FACTORY
// =============================================================================

export function createAppTheme(mode: 'light' | 'dark'): Theme {
  const palette = mode === 'dark' ? darkPalette : lightPalette;

  return createTheme({
    palette,
    typography,
    spacing: 8,
    shape: {
      borderRadius: 6,
    },
    shadows: createShadows(mode) as Theme['shadows'],
    components: createComponentOverrides(mode, palette),
  });
}

// Export default light theme for backwards compatibility
export const theme = createAppTheme('light');
