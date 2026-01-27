/**
 * Color Helpers
 *
 * Presentation layer helpers that use constants.
 * Re-exports constants for backward compatibility.
 */

// Re-export all constants for backward compatibility
export {
  STATUS_COLORS,
  STATUS_LABELS,
  NEUTRAL_PILL,
  PRODUCT_FALLBACK_PALETTE,
  EDITOR_FALLBACK_PALETTE,
  type StatusKey,
  type StatusColorSet,
  type ProductColorSet,
  type EditorColorSet,
} from '../constants';

// Import for internal use
import {
  STATUS_COLORS,
  PRODUCT_OVERRIDES,
  PRODUCT_COLOR_PALETTE,
  EDITOR_OVERRIDES,
  EDITOR_COLOR_PALETTE,
  hashString,
  type StatusKey,
  type StatusColorSet,
  type ProductColorSet,
  type EditorColorSet,
} from '../constants';

// =============================================================================
// COLOR GETTERS
// =============================================================================

/**
 * Get status colors by status key.
 */
export function getStatusColors(status: StatusKey): StatusColorSet {
  return STATUS_COLORS[status];
}

/**
 * Get product colors by product ID.
 * 1. If explicit override exists → use it
 * 2. Else → compute deterministic fallback from hash
 */
export function getProductColors(productId: string): ProductColorSet {
  // Check for explicit override first
  if (productId in PRODUCT_OVERRIDES) {
    return PRODUCT_OVERRIDES[productId];
  }
  // Fallback to deterministic hash-based color
  const index = hashString(productId) % PRODUCT_COLOR_PALETTE.length;
  return PRODUCT_COLOR_PALETTE[index];
}

/**
 * Get product dot color only (for backward compatibility).
 */
export function getProductDotColor(productId: string): string {
  return getProductColors(productId).dot;
}

/**
 * Get editor colors by editor ID.
 * 1. If explicit override exists → use it
 * 2. Else → compute deterministic fallback from hash
 */
export function getEditorColors(editorId: string): EditorColorSet {
  // Check for explicit override first
  if (editorId in EDITOR_OVERRIDES) {
    return EDITOR_OVERRIDES[editorId];
  }
  // Fallback to deterministic hash-based color
  const index = hashString(editorId) % EDITOR_COLOR_PALETTE.length;
  return EDITOR_COLOR_PALETTE[index];
}
