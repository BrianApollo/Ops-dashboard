/**
 * Typography Design System - Strict, limited set of typography tokens.
 *
 * All pages must use these tokens. No inline font sizes allowed.
 * Only 5 text sizes: textLg, textMd, textBase, textSm, textXs
 * Plus statNumber for dashboard metrics.
 */

import type { SxProps, Theme } from '@mui/material/styles';

// =============================================================================
// TYPOGRAPHY TOKENS - The only 5 text styles allowed
// =============================================================================

/** Page/section titles - 16px semibold */
export const textLg: SxProps<Theme> = {
  fontSize: '1rem',      // 16px
  fontWeight: 600,
  lineHeight: 1.4,
};

/** Headers, labels - 14px medium */
export const textMd: SxProps<Theme> = {
  fontSize: '0.875rem',  // 14px
  fontWeight: 500,
  lineHeight: 1.5,
};

/** Body text - 14px regular */
export const textBase: SxProps<Theme> = {
  fontSize: '0.875rem',  // 14px
  fontWeight: 400,
  lineHeight: 1.5,
};

/** Secondary/helper text - 12px regular */
export const textSm: SxProps<Theme> = {
  fontSize: '0.75rem',   // 12px
  fontWeight: 400,
  lineHeight: 1.4,
};

/** Micro text (IDs, codes) - 11px medium */
export const textXs: SxProps<Theme> = {
  fontSize: '0.6875rem', // 11px
  fontWeight: 500,
  lineHeight: 1.4,
};

/** Large stat numbers - 24px bold */
export const statNumber: SxProps<Theme> = {
  fontSize: '1.5rem',    // 24px
  fontWeight: 700,
  lineHeight: 1.1,
  letterSpacing: '-0.02em',
};

// =============================================================================
// SEMANTIC ALIASES - For common patterns
// =============================================================================

/** Section header (alias for textMd) */
export const sectionHeader = textMd;

/** Form label (alias for textSm with color) */
export const formLabel: SxProps<Theme> = {
  ...textSm,
  color: 'text.secondary',
  mb: 0.5,
};

/** Helper text (alias for textSm with color) */
export const helperText: SxProps<Theme> = {
  ...textSm,
  color: 'text.secondary',
};

/** Monospace ID display */
export const monoText: SxProps<Theme> = {
  ...textXs,
  fontFamily: 'monospace',
  color: 'text.secondary',
};
