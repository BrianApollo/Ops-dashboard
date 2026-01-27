/**
 * Types for Campaign Launch workflow.
 * Shared across all launch components.
 * UI-only types - domain models come from features.
 */

// =============================================================================
// CREATIVE SELECTION
// =============================================================================

export type VideoUploadStatus = 'idle' | 'queued' | 'uploading' | 'processing' | 'ready' | 'failed';

export interface SelectableVideo {
  id: string;
  name: string;
  status: string;
  format?: string;
  /** Storage URL (Cloudflare R2 or legacy Drive) */
  creativeLink?: string;
  productId?: string;
  // Library/upload state (session-only)
  inLibrary?: boolean;
  fbVideoId?: string;
  fbThumbnailUrl?: string;
  thumbnailUrl?: string;
  uploadStatus?: VideoUploadStatus;
  uploadError?: string;
}

export interface SelectableImage {
  id: string;
  name: string;
  status?: string;
  imageType?: string;
  thumbnailUrl?: string;
  /** Storage file ID/key (Cloudflare R2 key or legacy Drive file ID) */
  driveFileId?: string;
  /** Storage URL (Cloudflare R2 or legacy Drive) */
  image_drive_link?: string;
  image_url?: string;
  productId?: string;
}

export type CreativeTab = 'videos' | 'images';

// =============================================================================
// INFRASTRUCTURE
// =============================================================================

export interface InfraOption {
  id: string;
  name: string;
  externalId?: string; // act_XXX, page ID, pixel ID
  status: string;
}

// =============================================================================
// CAMPAIGN DRAFT
// =============================================================================

/**
 * Draft state for campaign being launched.
 * Contains all user selections + form values.
 */
export interface CampaignDraft {
  // Identity
  name: string;
  productId?: string;
  campaignId?: string; // Airtable campaign record ID

  // Facebook Infrastructure
  adAccountId: string | null;
  pageId: string | null;
  pixelId: string | null;

  // Redtrack
  redtrackCampaignId: string;
  redtrackCampaignName: string;

  // Ad Preset (from Airtable)
  adPresetId: string | null;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  beneficiaryName?: string;
  payerName?: string;
  cta?: string;

  // Delivery
  budget: string;
  startDate: string;
  startTime: string;
  geo: string;
  ctaOverride: string;

  // URL & Tracking
  websiteUrl: string;
  utms: string;
  displayLink: string | null;

  // Link variable for {{link}} replacement
  linkVariable: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationCheck {
  id: string;
  label: string;
  group?: 'assets' | 'infrastructure' | 'delivery' | 'system';
  passed: boolean;
}

export interface ValidationGroup {
  name: string;
  checks: ValidationCheck[];
  allPassed: boolean;
}

// =============================================================================
// LAUNCH MODE
// =============================================================================

export type LaunchMode = 'dry-run' | 'real';
