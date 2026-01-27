/**
 * Ad Presets Feature
 *
 * Public API for the ad presets feature.
 * All imports from this feature should go through this file.
 *
 * IMPORTANT: Ad Presets are reusable copy & config presets, NOT Facebook entities.
 * They contain advertising copy (headlines, descriptions, primary text) and
 * compliance information (beneficiary, payer) for use during campaign launch.
 *
 * Facebook infrastructure (tokens, ad accounts, pages, pixels) is managed
 * separately in the Infrastructure feature.
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  AdPreset,
  AdPresetStatus,
  AdPresetFilters,
} from './types';

export {
  getPrimaryTexts,
  getHeadlines,
  getDescriptions,
} from './types';

// =============================================================================
// DATA LAYER
// =============================================================================

export {
  listAdPresets,
  listAdPresetsByProduct,
  getAdPreset,
  clearProductsCache,
  updateAdPreset,
} from './data';

export type { AdPresetUpdatePayload } from './data';

// =============================================================================
// CONTROLLER
// =============================================================================

export {
  useAdPresetsController,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from './useAdPresetsController';

export type { UseAdPresetsControllerResult } from './useAdPresetsController';
