/**
 * Status Constants
 *
 * Pure data layer - no dependencies.
 * Used by both ui/ (presentation) and features/ (behavior).
 */

// =============================================================================
// STATUS TYPES
// =============================================================================

/**
 * All status keys across domains.
 * - Video/Creative: todo, review, available, used
 * - Scripts: draft, pending_review, approved, revision_needed, archived, unassigned, assigned
 * - Campaigns: preparing, launched
 * - Products: active, paused, archived, preparing, benched
 * - Images: pending, available, archived
 * - Ad Presets: active, paused, disabled
 */
export type StatusKey =
  | 'todo' | 'review' | 'available' | 'used'
  | 'unassigned' | 'assigned'
  | 'draft' | 'live' | 'active' | 'paused' | 'ended' | 'completed'
  | 'preparing' | 'launched' | 'benched'
  | 'pending' | 'archived' | 'disabled'
  | 'pending_review' | 'approved' | 'revision_needed'
  | 'new' | 'cancelled';

export interface StatusColorSet {
  bg: string;
  text: string;
  bgSubtle: string;
  border: string;
}

// =============================================================================
// STATUS COLORS
// =============================================================================

/**
 * Status colors - authoritative definitions.
 * Single source of truth for all status pill colors.
 */
export const STATUS_COLORS: Record<StatusKey, StatusColorSet> = {
  // Video / Creative statuses
  todo: {
    bg: '#fef3c7',      // amber-100
    text: '#92400e',    // amber-800
    bgSubtle: '#fffbeb', // amber-50
    border: '#fcd34d',  // amber-300
  },
  new: {
    bg: '#dbeafe',      // blue-100
    text: '#1e40af',    // blue-800
    bgSubtle: '#eff6ff', // blue-50
    border: '#93c5fd',  // blue-300
  },
  review: {
    bg: '#dbeafe',      // blue-100
    text: '#1e40af',    // blue-800
    bgSubtle: '#eff6ff', // blue-50
    border: '#93c5fd',  // blue-300
  },
  available: {
    bg: '#d1fae5',      // green-100
    text: '#065f46',    // green-800
    bgSubtle: '#ecfdf5', // green-50
    border: '#6ee7b7',  // green-300
  },
  used: {
    bg: '#e9d5ff',      // purple-100
    text: '#6b21a8',    // purple-800
    bgSubtle: '#faf5ff', // purple-50
    border: '#c4b5fd',  // purple-300
  },

  // Script statuses
  unassigned: {
    bg: '#fee2e2',      // red-100
    text: '#991b1b',    // red-800
    bgSubtle: '#fef2f2', // red-50
    border: '#fecaca',  // red-200
  },
  assigned: {
    bg: '#d1fae5',      // green-100 (same as available)
    text: '#065f46',    // green-800
    bgSubtle: '#ecfdf5', // green-50
    border: '#6ee7b7',  // green-300
  },

  // Campaign statuses
  draft: {
    bg: '#fef3c7',      // amber-100 (same as todo)
    text: '#92400e',    // amber-800
    bgSubtle: '#fffbeb', // amber-50
    border: '#fcd34d',  // amber-300
  },
  live: {
    bg: '#d1fae5',      // green-100 (same as available)
    text: '#065f46',    // green-800
    bgSubtle: '#ecfdf5', // green-50
    border: '#6ee7b7',  // green-300
  },
  active: {
    bg: '#d1fae5',      // green-100 (alias for live)
    text: '#065f46',    // green-800
    bgSubtle: '#ecfdf5', // green-50
    border: '#6ee7b7',  // green-300
  },
  paused: {
    bg: '#fee2e2',      // red-100
    text: '#991b1b',    // red-800
    bgSubtle: '#fef2f2', // red-50
    border: '#fecaca',  // red-200
  },
  ended: {
    bg: '#f3f4f6',      // gray-100
    text: '#6b7280',    // gray-500
    bgSubtle: '#f9fafb', // gray-50
    border: '#e5e7eb',  // gray-200
  },
  completed: {
    bg: '#f3f4f6',      // gray-100 (alias for ended)
    text: '#6b7280',    // gray-500
    bgSubtle: '#f9fafb', // gray-50
    border: '#e5e7eb',  // gray-200
  },

  // Product / Campaign statuses
  preparing: {
    bg: '#dbeafe',      // blue-100 (same as review)
    text: '#1e40af',    // blue-800
    bgSubtle: '#eff6ff', // blue-50
    border: '#93c5fd',  // blue-300
  },
  launched: {
    bg: '#d1fae5',      // green-100 (same as available)
    text: '#065f46',    // green-800
    bgSubtle: '#ecfdf5', // green-50
    border: '#6ee7b7',  // green-300
  },
  benched: {
    bg: '#f3f4f6',      // gray-100 (same as ended)
    text: '#6b7280',    // gray-500
    bgSubtle: '#f9fafb', // gray-50
    border: '#e5e7eb',  // gray-200
  },
  cancelled: {
    bg: '#fee2e2',      // red-100
    text: '#991b1b',    // red-800
    bgSubtle: '#fef2f2', // red-50
    border: '#fecaca',  // red-200
  },

  // Image statuses
  pending: {
    bg: '#fef3c7',      // amber-100 (same as todo)
    text: '#92400e',    // amber-800
    bgSubtle: '#fffbeb', // amber-50
    border: '#fcd34d',  // amber-300
  },
  archived: {
    bg: '#f3f4f6',      // gray-100 (same as ended)
    text: '#6b7280',    // gray-500
    bgSubtle: '#f9fafb', // gray-50
    border: '#e5e7eb',  // gray-200
  },

  // Ad Preset statuses
  disabled: {
    bg: '#f3f4f6',      // gray-100
    text: '#6b7280',    // gray-500
    bgSubtle: '#f9fafb', // gray-50
    border: '#e5e7eb',  // gray-200
  },

  // Script statuses
  pending_review: {
    bg: '#fef3c7',      // amber-100 (same as todo)
    text: '#92400e',    // amber-800
    bgSubtle: '#fffbeb', // amber-50
    border: '#fcd34d',  // amber-300
  },
  approved: {
    bg: '#d1fae5',      // green-100 (same as available)
    text: '#065f46',    // green-800
    bgSubtle: '#ecfdf5', // green-50
    border: '#6ee7b7',  // green-300
  },
  revision_needed: {
    bg: '#fee2e2',      // red-100 (same as unassigned)
    text: '#991b1b',    // red-800
    bgSubtle: '#fef2f2', // red-50
    border: '#fecaca',  // red-200
  },
};

// =============================================================================
// STATUS LABELS
// =============================================================================

/**
 * Human-readable labels for status keys.
 */
export const STATUS_LABELS: Record<StatusKey, string> = {
  // Video/Creative
  todo: 'To Do',
  review: 'In Review',
  available: 'Available',
  used: 'Used',
  // Script assignment
  unassigned: 'Unassigned',
  assigned: 'Assigned',
  // Campaign
  draft: 'Draft',
  live: 'Live',
  active: 'Active',
  paused: 'Paused',
  ended: 'Ended',
  completed: 'Completed',
  // Product / Campaign
  preparing: 'Preparing',
  launched: 'Launched',
  benched: 'Benched',
  // Image / Product / Ad Preset
  pending: 'Pending',
  archived: 'Archived',
  disabled: 'Disabled',
  // Script status
  pending_review: 'Pending Review',
  approved: 'Approved',
  revision_needed: 'Revision Needed',
  new: 'New',
  cancelled: 'Cancelled',
};
