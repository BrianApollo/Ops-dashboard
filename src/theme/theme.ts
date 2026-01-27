/**
 * App Theme - Modern, sophisticated design with dark/light mode support.
 *
 * Design philosophy:
 * - Clean, minimal aesthetic with purposeful use of color
 * - Refined grays for hierarchy and depth
 * - Accent colors used sparingly for emphasis
 * - Excellent contrast ratios for accessibility
 * - Smooth transitions between modes
 */

import { createTheme, alpha, Theme } from '@mui/material/styles';

// =============================================================================
// COLOR PALETTE
// =============================================================================

// Primary accent - Refined orange/amber
const primaryMain = '#F97316';
const primaryLight = '#FB923C';
const primaryDark = '#EA580C';

// Semantic colors
const successMain = '#10B981';
const successLight = '#34D399';
const successDark = '#059669';

const warningMain = '#F59E0B';
const warningLight = '#FBBF24';
const warningDark = '#D97706';

const errorMain = '#EF4444';
const errorLight = '#F87171';
const errorDark = '#DC2626';

const infoMain = '#3B82F6';
const infoLight = '#60A5FA';
const infoDark = '#2563EB';

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
    main: '#6366F1',
    light: '#818CF8',
    dark: '#4F46E5',
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
  divider: 'rgba(0, 0, 0, 0.06)',
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
  // Custom colors for the app
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
    main: '#FB923C', // Slightly lighter for dark mode
    light: '#FDBA74',
    dark: primaryMain,
    contrastText: '#0F172A',
  },
  secondary: {
    main: '#818CF8',
    light: '#A5B4FC',
    dark: '#6366F1',
    contrastText: '#0F172A',
  },
  success: { main: '#34D399', light: '#6EE7B7', dark: successMain },
  warning: { main: '#FBBF24', light: '#FCD34D', dark: warningMain },
  error: { main: '#F87171', light: '#FCA5A5', dark: errorMain },
  info: { main: '#60A5FA', light: '#93C5FD', dark: infoMain },
  background: {
    default: '#0F172A',
    paper: '#1E293B',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    disabled: '#64748B',
  },
  action: {
    hover: 'rgba(255, 255, 255, 0.05)',
    selected: alpha('#FB923C', 0.12),
    disabled: 'rgba(255, 255, 255, 0.26)',
    disabledBackground: 'rgba(255, 255, 255, 0.08)',
    focus: alpha('#FB923C', 0.16),
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
    'Inter',
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
  fontWeightBold: 600,
  h1: { fontSize: '2.25rem', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.025em' },
  h2: { fontSize: '1.75rem', fontWeight: 500, lineHeight: 1.25, letterSpacing: '-0.02em' },
  h3: { fontSize: '1.375rem', fontWeight: 500, lineHeight: 1.3, letterSpacing: '-0.015em' },
  h4: { fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.35 },
  h5: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.4 },
  h6: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
  subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
  body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', lineHeight: 1.5 },
  caption: { fontSize: '0.75rem', lineHeight: 1.4, fontWeight: 400 },
  overline: { fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  button: { fontSize: '0.875rem', fontWeight: 500, textTransform: 'none' as const },
};

// =============================================================================
// SHADOWS
// =============================================================================

const createShadows = (mode: 'light' | 'dark') => {
  const shadowColor = mode === 'dark' ? '0, 0, 0' : '15, 23, 42';
  const opacity = mode === 'dark' ? 0.4 : 0.08;

  return [
    'none',
    `0 1px 2px rgba(${shadowColor}, ${opacity})`,
    `0 1px 3px rgba(${shadowColor}, ${opacity * 1.25})`,
    `0 4px 6px rgba(${shadowColor}, ${opacity})`,
    `0 4px 8px rgba(${shadowColor}, ${opacity * 1.1})`,
    `0 6px 12px rgba(${shadowColor}, ${opacity * 1.1})`,
    `0 8px 16px rgba(${shadowColor}, ${opacity * 1.2})`,
    `0 12px 24px rgba(${shadowColor}, ${opacity * 1.3})`,
    `0 16px 32px rgba(${shadowColor}, ${opacity * 1.4})`,
    `0 20px 40px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
    `0 24px 48px rgba(${shadowColor}, ${opacity * 1.5})`,
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
      // Custom scrollbar
      '::-webkit-scrollbar': {
        width: 8,
        height: 8,
      },
      '::-webkit-scrollbar-track': {
        background: mode === 'dark' ? '#1E293B' : '#F1F5F9',
      },
      '::-webkit-scrollbar-thumb': {
        background: mode === 'dark' ? '#475569' : '#CBD5E1',
        borderRadius: 4,
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
        borderRadius: 12,
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
        borderRadius: 8,
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
        borderRadius: 10,
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
          transform: 'translateY(-1px)',
        },
      },
      containedPrimary: {
        background: `linear-gradient(135deg, ${palette.primary.main} 0%, ${palette.primary.dark} 100%)`,
        '&:hover': {
          background: `linear-gradient(135deg, ${palette.primary.light} 0%, ${palette.primary.main} 100%)`,
        },
      },
      outlined: {
        borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
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
        borderRadius: 8,
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
        borderRadius: 6,
        transition: 'all 0.15s ease-in-out',
      },
      sizeSmall: {
        height: 24,
        fontSize: '0.7rem',
      },
      sizeMedium: {
        height: 28,
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
        borderRadius: 8,
        transition: 'all 0.15s ease-in-out',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: palette.divider,
          transition: 'border-color 0.15s ease-in-out',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderWidth: 2,
          borderColor: palette.primary.main,
        },
      },
      input: {
        padding: '10px 14px',
      },
      inputSizeSmall: {
        padding: '8px 12px',
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      select: {
        borderRadius: 8,
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
        borderRadius: 12,
        border: `1px solid ${palette.divider}`,
        overflow: 'hidden',
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-head': {
          backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#FAFBFC',
          fontWeight: 500,
          fontSize: '0.7rem',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
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
        padding: '14px 16px',
      },
      head: {
        padding: '12px 16px',
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
        borderRadius: 16,
        boxShadow: mode === 'dark'
          ? '0 24px 48px rgba(0, 0, 0, 0.4)'
          : '0 24px 48px rgba(15, 23, 42, 0.12)',
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
        borderRadius: 8,
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
        fontSize: '0.875rem',
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
        height: 3,
        borderRadius: '3px 3px 0 0',
        backgroundColor: palette.primary.main,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: mode === 'dark' ? '#334155' : '#1E293B',
        color: '#F1F5F9',
        fontSize: '0.75rem',
        fontWeight: 500,
        padding: '6px 12px',
        borderRadius: 6,
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      },
      bar: {
        borderRadius: 4,
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
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
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
      borderRadius: 8,
    },
    shadows: createShadows(mode) as Theme['shadows'],
    components: createComponentOverrides(mode, palette),
  });
}

// Export default light theme for backwards compatibility
export const theme = createAppTheme('light');
