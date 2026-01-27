/**
 * Canonical domain model for Products.
 * This is the UI-facing shape — NOT the Airtable schema.
 */

// =============================================================================
// STATUS TYPES
// =============================================================================

/**
 * Product status values.
 * TODO: Confirm these match Airtable "Status" field options
 */
export type ProductStatus = 'Active' | 'Preparing' | 'Benched';

// =============================================================================
// PRODUCT ASSET
// =============================================================================

/**
 * A product asset (image or logo) stored in Airtable + Google Drive.
 */
export interface ProductAsset {
  /** Airtable attachment ID */
  id: string;
  /** Airtable CDN URL (for display) */
  url: string;
  /** File name in Google Drive */
  filename: string;
  /** Google Drive file ID (for deletion) */
  driveFileId?: string;
}

// =============================================================================
// PRODUCT ENTITY
// =============================================================================

/**
 * Product domain model.
 * Products are the top-level workspace entity.
 */
export interface Product {
  id: string;
  name: string;
  status: ProductStatus;

  /** Google Drive folder ID for uploads */
  driveFolderId?: string;

  /** Product images (from Airtable attachments) */
  images: ProductAsset[];

  /** Product logos (from Airtable attachments) */
  logos: ProductAsset[];

  /** Record creation timestamp */
  createdAt: string;
}

// =============================================================================
// DERIVED COUNTS (injected, not from Airtable)
// =============================================================================

/**
 * Product with derived counts.
 * Counts are injected by the controller, NOT stored in Airtable.
 */
export interface ProductWithCounts extends Product {
  /** Number of videos with status 'available' */
  availableVideosCount: number;

  /** Number of images with status 'available' */
  availableImagesCount: number;

  /** Number of campaigns with status 'active' */
  activeCampaignsCount: number;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Product filter state.
 */
export interface ProductFilters {
  status: ProductStatus[];
}

// =============================================================================
// COUNT INJECTOR TYPE
// =============================================================================

/**
 * Interface for injecting counts into products.
 * Used by controller to receive counts from other features.
 */
export interface ProductCountsProvider {
  getAvailableVideosCount: (productId: string) => number;
  getAvailableImagesCount: (productId: string) => number;
  getActiveCampaignsCount: (productId: string) => number;
}
