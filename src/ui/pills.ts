/**
 * Pill Style Helpers
 *
 * Provides consistent styling for pills across the application.
 * Uses the centralized color system from colors.ts.
 */

import type { CSSProperties } from 'react';
import type { SxProps, Theme } from '@mui/material';
import {
  getStatusColors,
  getProductColors,
  getEditorColors,
  NEUTRAL_PILL,
  type StatusKey,
} from './colors';

// =============================================================================
// STYLE TYPES
// =============================================================================

export interface PillStyle {
  backgroundColor: string;
  color: string;
  border?: string;
}

// =============================================================================
// BASE PILL STYLES
// =============================================================================

/**
 * Base CSS properties for all pills (React inline styles).
 */
export const basePillStyle: CSSProperties = {
  display: 'inline-block',
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: '4px 8px',
  borderRadius: 5,
  lineHeight: 1,
};

/**
 * Base MUI sx props for Chip components.
 */
export const baseChipSx: SxProps<Theme> = {
  fontWeight: 600,
  fontSize: '0.7rem',
  letterSpacing: '0.02em',
  border: 'none',
};

// =============================================================================
// STATUS PILL STYLES
// =============================================================================

/**
 * Get inline style for a status pill (React CSSProperties).
 */
export function getStatusPillStyle(status: StatusKey): PillStyle {
  const colors = getStatusColors(status);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
  };
}

/**
 * Get MUI sx props for a status Chip component.
 */
export function getStatusChipSx(status: StatusKey): SxProps<Theme> {
  const colors = getStatusColors(status);
  return {
    ...baseChipSx,
    bgcolor: colors.bg,
    color: colors.text,
  };
}

// =============================================================================
// PRODUCT PILL STYLES
// =============================================================================

/**
 * Get inline style for a product pill (React CSSProperties).
 * Includes dot color for rendering a colored circle.
 */
export function getProductPillStyle(productId: string): PillStyle & { dotColor: string } {
  const colors = getProductColors(productId);
  return {
    backgroundColor: NEUTRAL_PILL.bg,
    color: NEUTRAL_PILL.text,
    dotColor: colors.dot,
  };
}

/**
 * Get MUI sx props for a product Chip component.
 */
export function getProductChipSx(_productId: string): SxProps<Theme> {
  return {
    ...baseChipSx,
    fontWeight: 500,
    bgcolor: NEUTRAL_PILL.bg,
    color: NEUTRAL_PILL.text,
  };
}

/**
 * Get the dot color for a product pill.
 */
export function getProductDotColor(productId: string): string {
  return getProductColors(productId).dot;
}

// =============================================================================
// EDITOR PILL STYLES
// =============================================================================

/**
 * Get inline style for an editor pill (React CSSProperties).
 */
export function getEditorPillStyle(editorId: string): PillStyle {
  const colors = getEditorColors(editorId);
  return {
    backgroundColor: colors.pillBg,
    color: colors.text,
  };
}

/**
 * Get MUI sx props for an editor Chip component.
 */
export function getEditorChipSx(editorId: string): SxProps<Theme> {
  const colors = getEditorColors(editorId);
  return {
    ...baseChipSx,
    fontWeight: 500,
    bgcolor: colors.pillBg,
    color: colors.text,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

// Re-export color getters for convenience
export {
  getStatusColors,
  getProductColors,
  getEditorColors,
  STATUS_COLORS,
  NEUTRAL_PILL,
  type StatusKey,
} from './colors';
