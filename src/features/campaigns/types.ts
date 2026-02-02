/**
 * Canonical domain model for Campaigns.
 * This is the UI-facing shape — NOT the Airtable schema.
 */

// =============================================================================
// STATUS TYPES
// =============================================================================

/**
 * Campaign status values.
 * Maps directly to Airtable Status field values.
 */
export type CampaignStatus = 'Preparing' | 'Launched' | 'Cancelled';

/**
 * Platform values for campaigns.
 */
export type CampaignPlatform = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'google' | 'other';

// =============================================================================
// READINESS TYPES
// =============================================================================

/**
 * Readiness state for a single asset type.
 */
export interface AssetReadiness {
  /** Number of assets ready/complete */
  ready: number;
  /** Total number of assets required */
  total: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Is this asset type fully ready? */
  isComplete: boolean;
}

/**
 * Overall campaign readiness across all asset types.
 * Derived from product aggregates — NOT stored in Airtable.
 */
export interface CampaignReadiness {
  scripts: AssetReadiness;
  videos: AssetReadiness;
  images: AssetReadiness;
  /** Overall readiness (all asset types complete) */
  isFullyReady: boolean;
  /** Overall percentage (average across all types) */
  overallPercentage: number;
}

// =============================================================================
// CAMPAIGN ENTITY
// =============================================================================

/**
 * Campaign domain model.
 */
export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;

  /** Linked product (campaigns belong to products) */
  product: {
    id: string;
    name: string;
  };

  /** Advertising platform */
  platform?: CampaignPlatform;

  /** RedTrack campaign name for tracking */
  redTrackName?: string;

  /** RedTrack campaign ID (from Redtrack system) */
  redtrackCampaignId?: string;

  /** Campaign notes/description */
  notes?: string;

  /** Campaign dates */
  startDate?: string;
  endDate?: string;

  /** Budget in dollars */
  budget?: number;

  /** Campaign description/notes */
  description?: string;

  // ==========================================================================
  // LAUNCH DATA (populated after successful Facebook launch)
  // ==========================================================================

  /** Facebook Campaign ID (from Facebook Ads) */
  fbCampaignId?: string;

  /** Facebook Ad Account ID used for launch */
  fbAdAccountId?: string;

  /** Profile ID used for launch (for access token retrieval) */
  launchProfileId?: string;

  /** Full JSON snapshot of everything at launch time (stored in Airtable) */
  launchedData?: string;

  // ==========================================================================
  // DRAFT DATA (saved via Save Draft / auto-save)
  // ==========================================================================

  /** Launch date (YYYY-MM-DD) */
  launchDate?: string;

  /** Launch time (HH:MM) */
  launchTime?: string;

  /** Location targeting (comma-separated country codes) */
  locationTargeting?: string;

  /** Website/landing page URL */
  websiteUrl?: string;

  /** UTM/tracking parameters */
  utms?: string;

  /** Ad account ID used */
  adAccUsed?: string;

  /** Facebook page ID used */
  pageUsed?: string;

  /** Facebook pixel ID used */
  pixelUsed?: string;

  /** Selected Ad Preset ID (linked record) */
  selectedAdProfile?: string;

  /** Call to Action */
  cta?: string;

  /** Display link for ads */
  displayLink?: string;

  /** Link variable for replacing {{link}} in ad texts */
  linkVariable?: string;

  /** Draft profile ID (selected profile for launch setup) */
  draftProfileId?: string;

  /** Reuse existing creatives flag */
  reuseCreatives?: boolean;

  /** Launch as active (not paused) flag */
  launchAsActive?: boolean;

  /** Record creation timestamp */
  createdAt: string;

  /** Record last modified timestamp */
  updatedAt?: string;
}

/**
 * Campaign with derived readiness data.
 * Derived from product aggregates — NOT stored in Airtable.
 */
export interface CampaignWithReadiness extends Campaign {
  /** Does this campaign have creatives assigned? */
  hasCreatives: boolean;

  /** Readiness status for the campaign */
  readinessStatus: 'ready' | 'partial' | 'blocked';
}

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Campaign filter state.
 */
export interface CampaignFilters {
  status: CampaignStatus[];
  productId: string | null;
}

// =============================================================================
// AGGREGATE TYPES (for readiness calculation)
// =============================================================================

/**
 * Product-level asset aggregates.
 * Used to calculate campaign readiness.
 */
export interface ProductAssetAggregates {
  productId: string;

  /** Script counts by status */
  scripts: {
    total: number;
    approved: number;
  };

  /** Video counts by status */
  videos: {
    total: number;
    available: number;
  };

  /** Image counts by status */
  images: {
    total: number;
    ready: number;
  };
}
