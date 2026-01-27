/**
 * Canonical domain model for Scripts.
 * This is the UI-facing shape — NOT the Airtable schema.
 */

// =============================================================================
// STATUS TYPES
// =============================================================================

/**
 * Script status values.
 */
export type ScriptStatus = 'draft' | 'pending_review' | 'approved' | 'revision_needed' | 'archived';

// =============================================================================
// SCRIPT ENTITY
// =============================================================================

/**
 * Script domain model.
 * Scripts belong to products and contain ad copy/content.
 */
export interface Script {
  id: string;
  name: string;
  status: ScriptStatus;

  /** Associated product */
  product: {
    id: string;
    name: string;
  };

  /** Script author (linked to Users table) */
  author?: {
    id: string;
    name: string;
  };

  /** Script content/copy */
  content?: string;

  /** Whether the script is approved for use */
  isApproved: boolean;

  /** Whether the script needs revision */
  needsRevision: boolean;

  /** Version number for tracking revisions */
  version?: number;

  /** Notes/comments */
  notes?: string;

  /** Record creation timestamp */
  createdAt: string;

  /** Last modified timestamp */
  updatedAt?: string;

  // =============================================================================
  // HOOK FIELDS
  // =============================================================================

  /** The hook/intro portion of the script (for hook variants) */
  hook?: string;

  /** The body portion of the script (shared across hook variants) */
  body?: string;

  /** Hook number (1, 2, 3...). Null for simple scripts without hooks */
  hookNumber?: number;

  /** The base script number for querying sibling hooks (e.g., 1014 for "Script 1014 Hk2") */
  baseScriptNumber?: number;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Script filter state.
 */
export interface ScriptFilters {
  status: ScriptStatus[];
  productId: string | null;
  isApproved: boolean | null;
}

// =============================================================================
// COUNTS PROVIDER
// =============================================================================

/**
 * Interface for providing script counts to other features.
 */
export interface ScriptCountsProvider {
  getApprovedScriptsCount: (productId: string) => number;
  getTotalScriptsCount: (productId: string) => number;
}
