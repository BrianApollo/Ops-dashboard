/**
 * Launch Types
 *
 * Shared types for the campaign launch system.
 */

// =============================================================================
// MEDIA TYPES
// =============================================================================

export interface VideoToUpload {
  id: string;
  name: string;
  /** Storage URL (Cloudflare R2 or legacy Drive) */
  driveUrl: string;
}

export interface ImageToUpload {
  id: string;
  name: string;
  /** Storage URL (Cloudflare R2 or legacy Drive) */
  driveUrl: string;
  /** Image link field (Cloudflare R2 or legacy Drive) */
  image_drive_link?: string;
}

export interface UploadedMedia {
  type: 'video' | 'image';
  localId: string;
  name: string;
  fbMediaId: string;
  thumbnailUrl?: string;
  imageUrl?: string;
}

export interface FailedMedia {
  type: 'video' | 'image';
  localId: string;
  name: string;
  error: string;
}

// =============================================================================
// PROGRESS TYPES
// =============================================================================

export type MediaUploadStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'complete'
  | 'failed'
  | 'creating-ad'
  | 'ad-created';

export interface MediaProgress {
  mediaId: string;
  name: string;
  type: 'video' | 'image';
  status: MediaUploadStatus;
  message: string;
  fbMediaId?: string;
  thumbnailUrl?: string;
  adId?: string;
  error?: string;
}

export interface UploadProgress {
  totalMedia: number;
  completedMedia: number;
  failedMedia: number;
  currentBatch: number;
  totalBatches: number;
  mediaStatus: MediaProgress[];
}

// =============================================================================
// STEP INPUT/OUTPUT TYPES
// =============================================================================

// Upload Media Step
export interface UploadMediaInput {
  videos: VideoToUpload[];
  images: ImageToUpload[];
  adAccountId: string;
  accessToken: string;
  batchSize?: number;
  /** If true, check if media already exists in ad account before uploading */
  reuseCreatives?: boolean;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadMediaResult {
  success: boolean;
  uploadedMedia: UploadedMedia[];
  failedMedia: FailedMedia[];
  error?: string;
}

// Create Campaign Step
export interface CreateCampaignInput {
  adAccountId: string;
  accessToken: string;
  campaignName: string;
  budget: number;
  startDate?: string;
  /** EU DSA compliance: beneficiary name (required for EU targeting) */
  dsaBeneficiary?: string;
  /** EU DSA compliance: payor name (defaults to beneficiary if not set) */
  dsaPayor?: string;
  status?: 'ACTIVE' | 'PAUSED';
}

export interface CreateCampaignResult {
  success: boolean;
  campaignId?: string;
  error?: string;
}

// Create Ad Set Step
export interface CreateAdSetInput {
  adAccountId: string;
  accessToken: string;
  campaignId: string;
  adSetName: string;
  pixelId: string;
  geoTargets?: string[];
  startDate?: string;
  status?: 'ACTIVE' | 'PAUSED';
}

export interface CreateAdSetResult {
  success: boolean;
  adSetId?: string;
  error?: string;
}

// Create Ads Step
export interface CreateAdsInput {
  adAccountId: string;
  accessToken: string;
  adSetId: string;
  pageId: string;
  uploadedMedia: UploadedMedia[];
  websiteUrl: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction?: string;
  utmParams?: string;
  onProgress?: (adIndex: number, totalAds: number, mediaName: string) => void;
  onCreativeCreated?: (mediaName: string) => void;
  onAdCreated?: (mediaName: string, adId: string) => void;
  status?: 'ACTIVE' | 'PAUSED';
}

export interface UploadedMediaStatus {
  type: 'video' | 'image';
  name: string;
  id: string;
  status: boolean;
}

export interface CreateAdsResult {
  success: boolean;
  adIds: string[];
  failedAds: Array<{ mediaId: string; mediaName: string; error: string }>;
  uploadedMediaStatus: UploadedMediaStatus[];
}

// Link RedTrack Step
export interface LinkRedTrackInput {
  redtrackApiKey: string;
  redtrackCampaignId: string;
  facebookCampaignId: string;
  facebookAdAccountId: string;
}

export interface LinkRedTrackResult {
  success: boolean;
  clickUrl?: string;
  conversionUrl?: string;
  postbackUrl?: string;
  error?: string;
}

// =============================================================================
// ORCHESTRATOR TYPES
// =============================================================================

export type LaunchState =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'creating-campaign'
  | 'creating-adset'
  | 'creating-ads'
  | 'linking-redtrack'
  | 'complete'
  | 'failed';

export interface LaunchProgress {
  state: LaunchState;
  message: string;
  uploadProgress?: UploadProgress;
  campaignId?: string;
  adSetId?: string;
  adIds?: string[];
  currentAdIndex?: number;
  totalAds?: number;
}

export interface LaunchInputRedtrackData {
  campaignId: string;
  campaignName?: string;
  lander?: {
    id: string;
    title: string;
    url: string;
  };
  offer?: {
    id: string;
    title: string;
    url?: string;
    payout?: number;
  };
}

export interface LaunchInputAdPreset {
  id: string;
  name: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction?: string;
  beneficiaryName?: string;
  payerName?: string;
}

export interface LaunchInput {
  campaignId: string;
  adAccountId: string;
  accessToken: string;
  /** Profile ID used for launch (for access token retrieval later) */
  profileId: string;
  /** Profile name for snapshot */
  profileName?: string;
  pageId: string;
  pixelId: string;
  videos: VideoToUpload[];
  images: ImageToUpload[];
  campaignName: string;
  budget: number;
  websiteUrl: string;
  startDate?: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction?: string;
  utmParams?: string;
  geoTargets?: string[];
  /** EU DSA compliance: beneficiary name (required for EU targeting) */
  dsaBeneficiary?: string;
  /** EU DSA compliance: payor name (defaults to beneficiary if not set) */
  dsaPayor?: string;
  /** RedTrack data for snapshot */
  redtrackData?: LaunchInputRedtrackData;
  /** Ad preset data for snapshot */
  adPresetData?: LaunchInputAdPreset;
  redtrackCampaignId?: string;
  redtrackApiKey?: string;
  /** If true, check if media already exists in ad account before uploading */
  reuseCreatives?: boolean;
  onProgress?: (progress: LaunchProgress) => void;
  status?: 'ACTIVE' | 'PAUSED';
}

export interface LaunchResult {
  success: boolean;
  campaignId?: string;
  adSetId?: string;
  adIds: string[];
  uploadedMedia: UploadedMedia[];
  failedMedia: FailedMedia[];
  uploadedMediaStatus: UploadedMediaStatus[];
  redtrackUrls?: {
    clickUrl: string;
    conversionUrl: string;
    postbackUrl: string;
  };
  error?: string;
  finalState: LaunchState;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const FB_GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
export const DEFAULT_BATCH_SIZE = 5;
export const BATCH_DELAY_MS = 1000;
export const VIDEO_POLL_INTERVAL_MS = 10000; // 5 seconds (matches working autolauncher)
export const VIDEO_POLL_MAX_ATTEMPTS = 240; // 120 attempts * 5s = 10 minutes

// =============================================================================
// FB LAUNCH RUNNER TYPES (New Pipeline)
// =============================================================================

// Re-export types from fbLaunchRunner for convenience
export type {
  MediaType as FbMediaType,
  MediaItemState as FbMediaItemState,
  LaunchPhase as FbLaunchPhase,
  FbLaunchMediaInput,
  FbLaunchMediaState,
  FbLaunchOptions,
  FbLaunchInput,
  FbLaunchStats,
  FbLaunchState,
  OnProgressCallback as FbOnProgressCallback,
  FbLaunchController,
} from './fbLaunchRunner';

// Re-export types from fbLaunchApi for convenience
export type {
  CampaignConfig as FbCampaignConfig,
  AdSetConfig as FbAdSetConfig,
  AdSetTargeting as FbAdSetTargeting,
  AdCreativeConfig as FbAdCreativeConfig,
} from './fbLaunchApi';

// =============================================================================
// LAUNCH SNAPSHOT TYPES (for Airtable JSON storage)
// =============================================================================

export interface LaunchSnapshotRedtrackLander {
  id: string;
  title: string;
  url: string;
}

export interface LaunchSnapshotRedtrackOffer {
  id: string;
  title: string;
  url?: string;
  payout?: number;
}

export interface LaunchSnapshotMedia {
  localId: string;
  name: string;
  /** Storage file ID/key (Cloudflare R2 key or legacy Drive file ID) */
  driveFileId?: string;
  fbMediaId?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  adId?: string;
}

export interface LaunchSnapshotFailedMedia {
  localId: string;
  name: string;
  error: string;
  failedAt: 'upload' | 'processing' | 'ad-creation';
}

/**
 * Complete snapshot of everything at launch time.
 * Stored as JSON in Airtable for historical record.
 */
export interface LaunchSnapshot {
  version: number;
  launchedAt: string;

  config: {
    campaignName: string;
    budget: number;
    budgetCents: number;
    geo: string[];
    startDate?: string;
    startTime?: string;
    websiteUrl: string;
    utms?: string;
    displayLink?: string;
    ctaOverride?: string;
    launchStatus: 'ACTIVE' | 'PAUSED';
  };

  facebook: {
    adAccountId: string;
    pageId: string;
    pixelId: string;
    campaignId?: string;
    adSetId?: string;
    adIds: string[];
  };

  profile: {
    id: string;
    name?: string;
  };

  adPreset?: {
    id: string;
    name: string;
    primaryTexts: string[];
    headlines: string[];
    descriptions: string[];
    callToAction?: string;
    beneficiaryName?: string;
    payerName?: string;
  };

  redtrack?: {
    campaignId: string;
    campaignName?: string;
    lander?: LaunchSnapshotRedtrackLander;
    offer?: LaunchSnapshotRedtrackOffer;
    clickUrl?: string;
    conversionUrl?: string;
    postbackUrl?: string;
  };

  media: {
    summary: {
      videosAttempted: number;
      videosSucceeded: number;
      videosFailed: number;
      imagesAttempted: number;
      imagesSucceeded: number;
      imagesFailed: number;
    };
    videos: {
      succeeded: LaunchSnapshotMedia[];
      failed: LaunchSnapshotFailedMedia[];
    };
    images: {
      succeeded: LaunchSnapshotMedia[];
      failed: LaunchSnapshotFailedMedia[];
    };
  };

  result: {
    success: boolean;
    partialSuccess: boolean;
    dryRun: boolean;
    adsAttempted: number;
    adsCreated: number;
    adsFailed: number;
    completedAt: string;
    errors: Array<{
      mediaId: string;
      mediaName: string;
      stage: string;
      message: string;
    }>;
  };
}
