/**
 * Canonical domain model for Ad Presets.
 * This is the UI-facing shape — NOT the Airtable schema.
 *
 * IMPORTANT: Ad Presets are reusable copy & config presets, NOT Facebook entities.
 * They contain advertising copy (headlines, descriptions, primary text) and
 * compliance information (beneficiary, payer) for use during campaign launch.
 *
 * Facebook infrastructure (tokens, ad accounts, pages, pixels) is managed
 * separately in the Infrastructure feature.
 */

// =============================================================================
// STATUS TYPES
// =============================================================================

/**
 * Ad preset status values.
 */
export type AdPresetStatus = 'active' | 'paused' | 'disabled';

// =============================================================================
// AD PRESET ENTITY
// =============================================================================

/**
 * Ad Preset domain model.
 * Represents a reusable set of ad copy and configuration for a product.
 */
export interface AdPreset {
  id: string;
  name: string;
  status: AdPresetStatus;

  /** Associated product (required - presets are product-level) */
  product: {
    id: string;
    name: string;
  };

  // =========================================================================
  // AD COPY FIELDS
  // =========================================================================

  /** Primary text options (1-5) */
  primaryText1?: string;
  primaryText2?: string;
  primaryText3?: string;
  primaryText4?: string;
  primaryText5?: string;

  /** Headline options (1-5) */
  headline1?: string;
  headline2?: string;
  headline3?: string;
  headline4?: string;
  headline5?: string;

  /** Description options (1-5) */
  description1?: string;
  description2?: string;
  description3?: string;
  description4?: string;
  description5?: string;

  /** Call to action button text */
  callToAction?: string;

  // =========================================================================
  // COMPLIANCE FIELDS
  // =========================================================================

  /** Beneficiary name (required for some ad types) */
  beneficiaryName?: string;

  /** Payer name (required for political/issue ads) */
  payerName?: string;

  // =========================================================================
  // METADATA
  // =========================================================================

  /** Record creation timestamp */
  createdAt: string;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Ad preset filter state.
 */
export interface AdPresetFilters {
  status: AdPresetStatus[];
  productId: string | null;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Get all primary text values from a preset as an array.
 */
export function getPrimaryTexts(preset: AdPreset): string[] {
  return [
    preset.primaryText1,
    preset.primaryText2,
    preset.primaryText3,
    preset.primaryText4,
    preset.primaryText5,
  ].filter((t): t is string => !!t);
}

/**
 * Get all headlines from a preset as an array.
 */
export function getHeadlines(preset: AdPreset): string[] {
  return [
    preset.headline1,
    preset.headline2,
    preset.headline3,
    preset.headline4,
    preset.headline5,
  ].filter((h): h is string => !!h);
}

/**
 * Get all descriptions from a preset as an array.
 */
export function getDescriptions(preset: AdPreset): string[] {
  return [
    preset.description1,
    preset.description2,
    preset.description3,
    preset.description4,
    preset.description5,
  ].filter((d): d is string => !!d);
}
