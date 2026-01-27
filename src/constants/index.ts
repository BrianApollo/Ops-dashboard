/**
 * Constants Module
 *
 * Pure data layer - no dependencies.
 * Single source of truth for status keys, colors, and labels.
 *
 * Import Rules:
 * - ui/ imports from constants/
 * - features/ imports from constants/
 * - constants/ imports from nothing (pure data)
 */

// Status
export {
  STATUS_COLORS,
  STATUS_LABELS,
  type StatusKey,
  type StatusColorSet,
} from './status';

// Colors
export {
  NEUTRAL_PILL,
  PRODUCT_OVERRIDES,
  PRODUCT_FALLBACK_PALETTE,
  PRODUCT_COLOR_PALETTE,
  EDITOR_OVERRIDES,
  EDITOR_FALLBACK_PALETTE,
  EDITOR_COLOR_PALETTE,
  hashString,
  type ProductColorSet,
  type EditorColorSet,
} from './colors';
