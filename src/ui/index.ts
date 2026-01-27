/**
 * UI Module
 *
 * Centralized styling system for the application.
 */

// Colors
export {
  STATUS_COLORS,
  STATUS_LABELS,
  NEUTRAL_PILL,
  getStatusColors,
  getProductColors,
  getProductDotColor,
  getEditorColors,
  type StatusKey,
  type StatusColorSet,
  type ProductColorSet,
  type EditorColorSet,
} from './colors';

// Pills
export {
  basePillStyle,
  baseChipSx,
  getStatusPillStyle,
  getStatusChipSx,
  getProductPillStyle,
  getProductChipSx,
  getEditorPillStyle,
  getEditorChipSx,
  type PillStyle,
} from './pills';

// Components
export { StatusPill } from './StatusPill';
export { ToggleTabs, type ToggleTabsProps, type ToggleTabOption } from './ToggleTabs';
