/**
 * Canonical domain model for Images.
 * This is the UI-facing shape — NOT the Airtable schema.
 */

// =============================================================================
// STATUS TYPES
// =============================================================================

/**
 * Image status values.
 */
export type ImageStatus = 'pending' | 'available' | 'archived' | 'new';

/**
 * Image type/format.
 */
export type ImageType = 'thumbnail' | 'banner' | 'square' | 'story' | 'other';

// =============================================================================
// IMAGE ENTITY
// =============================================================================

/**
 * Image domain model.
 * Images belong to products and are used in campaigns.
 */
export interface Image {
  id: string;
  name: string;
  status: ImageStatus;

  /** Associated product */
  product: {
    id: string;
    name: string;
  };

  /** Image type/format */
  imageType?: ImageType;

  /** Google Drive file ID for the image */
  driveFileId?: string;

  /** Thumbnail URL (if available) */
  thumbnailUrl?: string;

  /** Image dimensions */
  width?: number;
  height?: number;

  /** File size in bytes */
  fileSize?: number;

  /** Notes/description */
  notes?: string;

  /** Campaign record IDs that use this image */
  usedInCampaigns: string[];

  /** Record creation timestamp */
  createdAt: string;

  /** Original Drive Link */
  image_drive_link?: string;

  /** Direct download URL for Facebook upload (computed from driveFileId or thumbnailUrl) */
  sourceUrl?: string;

  /** Temp Image URL */
  image_url?: string;
  count?: number;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Image filter state.
 */
export interface ImageFilters {
  status: ImageStatus[];
  productId: string | null;
  imageType: ImageType | null;
}

// =============================================================================
// COUNTS PROVIDER
// =============================================================================

/**
 * Interface for providing image counts to other features.
 */
export interface ImageCountsProvider {
  getAvailableImagesCount: (productId: string) => number;
  getTotalImagesCount: (productId: string) => number;
}
