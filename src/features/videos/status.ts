/**
 * Single source of truth for video status rules.
 * All status-related logic lives here — not in pages or panels.
 *
 * Colors are imported from the centralized constants layer.
 */

import type { VideoStatus, VideoAsset } from './types';
import {
  STATUS_COLORS as GLOBAL_STATUS_COLORS,
  STATUS_LABELS as GLOBAL_STATUS_LABELS,
  type StatusColorSet,
} from '../../constants';
import { getProductDotColor, getEditorColors } from '../../ui';

// Re-export video-specific labels from global constants
export const STATUS_LABELS: Record<VideoStatus, string> = {
  todo: GLOBAL_STATUS_LABELS.todo,
  review: GLOBAL_STATUS_LABELS.review,
  available: GLOBAL_STATUS_LABELS.available,
  used: GLOBAL_STATUS_LABELS.used,
};

// Theme colors for status (maps to MUI palette) - legacy, kept for compatibility
export const STATUS_COLORS: Record<VideoStatus, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  todo: 'default',
  review: 'warning',
  available: 'success',
  used: 'info',
};

// =============================================================================
// CENTRALIZED STATUS COLORS (from constants layer)
// =============================================================================

/**
 * Centralized status color definitions.
 * - To Do → amber
 * - Review → blue
 * - Available → green
 * - Used → purple
 *
 * @see src/constants/status.ts for authoritative definitions
 */
export const STATUS_THEME: Record<VideoStatus, StatusColorSet> = {
  todo: GLOBAL_STATUS_COLORS.todo,
  review: GLOBAL_STATUS_COLORS.review,
  available: GLOBAL_STATUS_COLORS.available,
  used: GLOBAL_STATUS_COLORS.used,
};

// =============================================================================
// COLOR HELPERS (delegated to UI system)
// =============================================================================

/**
 * Get a deterministic color for a product based on its ID.
 * Same product ID always gets the same color.
 *
 * @see src/ui/colors.ts for authoritative definitions
 */
export function getProductColor(productId: string): string {
  return getProductDotColor(productId);
}

/**
 * Get a deterministic color for an editor based on their ID.
 * Same editor ID always gets the same color.
 *
 * @see src/ui/colors.ts for authoritative definitions
 */
export function getEditorColor(editorId: string): { bg: string; text: string } {
  const colors = getEditorColors(editorId);
  return { bg: colors.pillBg, text: colors.text };
}

// Format display labels (Airtable single-select values only - NO aspect ratios)
export const FORMAT_LABELS: Record<string, string> = {
  square: 'Square',
  vertical: 'Vertical',
  youtube: 'YouTube',
};

// Format pill colors (no aspect ratios in UI)
// Square → neutral grey, Vertical → blue, YouTube → red
export const FORMAT_COLORS: Record<string, { bg: string; text: string }> = {
  square: { bg: '#F1F5F9', text: '#475569' },      // neutral grey
  vertical: { bg: '#EFF6FF', text: '#2563EB' },    // blue
  youtube: { bg: '#FEF2F2', text: '#DC2626' },     // red
};

// Text version pill colors
// Text → green, No Text → muted grey
export const TEXT_VERSION_COLORS: Record<string, { bg: string; text: string }> = {
  text: { bg: '#ECFDF5', text: '#059669' },        // green
  'no-text': { bg: '#F8FAFC', text: '#94A3B8' },   // muted grey
};

/**
 * Can this video be approved?
 * Only todo and review videos can be approved.
 */
export function canApprove(video: VideoAsset): boolean {
  return video.status === 'todo' || video.status === 'review';
}

/**
 * Can this video be archived?
 * Only available videos can be archived (marked as used).
 */
export function canArchive(video: VideoAsset): boolean {
  return video.status === 'available';
}

/**
 * Is this video in a read-only state?
 * Used videos cannot be edited.
 */
export function isReadOnly(video: VideoAsset): boolean {
  return video.status === 'used';
}

/**
 * Can any of the selected videos be approved?
 */
export function canApproveAny(videos: VideoAsset[]): boolean {
  return videos.some(canApprove);
}

/**
 * Can all selected videos be approved?
 */
export function canApproveAll(videos: VideoAsset[]): boolean {
  return videos.length > 0 && videos.every(canApprove);
}

/**
 * Get the next valid status transition for a video.
 */
export function getNextStatus(video: VideoAsset): VideoStatus | null {
  switch (video.status) {
    case 'todo':
      return 'review';
    case 'review':
      return 'available';
    case 'available':
      return 'used';
    case 'used':
      return null; // Terminal state
  }
}
