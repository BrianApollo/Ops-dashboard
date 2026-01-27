/**
 * Color Constants
 *
 * Pure data layer - no dependencies.
 * Provides color palettes for products and editors.
 */

// =============================================================================
// PRODUCT COLORS
// =============================================================================

export interface ProductColorSet {
  dot: string;
  pillBg: string;
  text: string;
}

/**
 * Explicit overrides for known products.
 * Products listed here will always get their assigned color.
 * Key is product ID.
 */
export const PRODUCT_OVERRIDES: Record<string, ProductColorSet> = {
  // Add known product IDs here as needed, e.g.:
  // 'prod-abc123': { dot: '#ef4444', pillBg: '#fef2f2', text: '#991b1b' },
};

/**
 * Neutral fallback palette for unknown products.
 * Professional colors that are visually distinct.
 */
export const PRODUCT_FALLBACK_PALETTE: ProductColorSet[] = [
  { dot: '#64748b', pillBg: '#f1f5f9', text: '#475569' },  // slate
  { dot: '#6b7280', pillBg: '#f3f4f6', text: '#4b5563' },  // gray
  { dot: '#78716c', pillBg: '#f5f5f4', text: '#57534e' },  // stone
  { dot: '#71717a', pillBg: '#f4f4f5', text: '#52525b' },  // zinc
  { dot: '#737373', pillBg: '#f5f5f5', text: '#525252' },  // neutral
  { dot: '#a3a3a3', pillBg: '#fafafa', text: '#525252' },  // neutral-light
];

/**
 * Color palette for products.
 */
export const PRODUCT_COLOR_PALETTE: ProductColorSet[] = [
  { dot: '#ef4444', pillBg: '#fef2f2', text: '#991b1b' },  // red
  { dot: '#f97316', pillBg: '#fff7ed', text: '#9a3412' },  // orange
  { dot: '#eab308', pillBg: '#fefce8', text: '#854d0e' },  // yellow
  { dot: '#22c55e', pillBg: '#f0fdf4', text: '#166534' },  // green
  { dot: '#06b6d4', pillBg: '#ecfeff', text: '#155e75' },  // cyan
  { dot: '#3b82f6', pillBg: '#eff6ff', text: '#1e40af' },  // blue
  { dot: '#8b5cf6', pillBg: '#f5f3ff', text: '#5b21b6' },  // violet
  { dot: '#ec4899', pillBg: '#fdf2f8', text: '#9d174d' },  // pink
];

// =============================================================================
// EDITOR COLORS
// =============================================================================

export interface EditorColorSet {
  pillBg: string;
  text: string;
}

/**
 * Explicit overrides for known editors.
 * Editors listed here will always get their assigned color.
 * Key is editor ID.
 */
export const EDITOR_OVERRIDES: Record<string, EditorColorSet> = {
  // Add known editor IDs here as needed, e.g.:
  // 'editor-abc123': { pillBg: '#fee2e2', text: '#991b1b' },
};

/**
 * Neutral fallback palette for unknown editors.
 * Professional colors that are visually distinct.
 */
export const EDITOR_FALLBACK_PALETTE: EditorColorSet[] = [
  { pillBg: '#f1f5f9', text: '#475569' },  // slate
  { pillBg: '#f3f4f6', text: '#4b5563' },  // gray
  { pillBg: '#f5f5f4', text: '#57534e' },  // stone
  { pillBg: '#f4f4f5', text: '#52525b' },  // zinc
  { pillBg: '#f5f5f5', text: '#525252' },  // neutral
  { pillBg: '#fafafa', text: '#525252' },  // neutral-light
];

/**
 * Color palette for editors.
 */
export const EDITOR_COLOR_PALETTE: EditorColorSet[] = [
  { pillBg: '#fee2e2', text: '#991b1b' },  // red
  { pillBg: '#ffedd5', text: '#9a3412' },  // orange
  { pillBg: '#fef9c3', text: '#854d0e' },  // yellow
  { pillBg: '#dcfce7', text: '#166534' },  // green
  { pillBg: '#cffafe', text: '#155e75' },  // cyan
  { pillBg: '#e0e7ff', text: '#3730a3' },  // indigo
  { pillBg: '#f3e8ff', text: '#6b21a8' },  // purple
  { pillBg: '#fce7f3', text: '#9d174d' },  // pink
];

// =============================================================================
// NEUTRAL COLORS
// =============================================================================

/**
 * Neutral pill colors for generic/product pills.
 * Primary neutral grey: #f1f3f6
 */
export const NEUTRAL_PILL = {
  bg: '#f1f3f6',
  text: '#6b7280',
};

// =============================================================================
// HASH FUNCTION
// =============================================================================

/**
 * Deterministic hash function for color assignment.
 * Same input always produces same output.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}
