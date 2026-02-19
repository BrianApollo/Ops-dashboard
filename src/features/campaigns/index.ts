/**
 * Campaigns Feature
 *
 * Public API for the campaigns feature.
 * All imports from this feature should go through this file.
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  Campaign,
  CampaignStatus,
  CampaignPlatform,
  CampaignWithReadiness,
  CampaignFilters,
  CampaignReadiness,
  AssetReadiness,
  ProductAssetAggregates,
} from './types';

// =============================================================================
// DATA LAYER
// =============================================================================

export {
  listCampaigns,
  listCampaignsByProduct,
  getCampaign,
  getProducts,
  clearProductsCache,
  updateCampaignRedtrackId,
  updateCampaignName,
  updateLaunchData,
  saveCampaignDraft,
  updateCampaignMedia,
  addImageIdsToCampaign,
  createCampaign,
  updateCampaignStatus,
} from './data';

export type { SaveCampaignDraftParams } from './data';

// =============================================================================
// READINESS LOGIC
// =============================================================================

export {
  deriveCampaignReadiness,
  deriveCampaignReadinessMap,
  getReadinessLabel,
  getReadinessColor,
  getBlockingIssues,
  createEmptyReadiness,
} from './readiness';

// =============================================================================
// CONTROLLER
// =============================================================================

export {
  useCampaignsController,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from './useCampaignsController';

export type { UseCampaignsControllerResult } from './useCampaignsController';

// =============================================================================
// FACEBOOK CAMPAIGN MANAGEMENT
// =============================================================================

export {
  // Read operations
  getFbCampaign,
  getFbAdSets,
  getFbAds,
  getFbCampaignData,
  getFbCreative,
  getFbVideoStatus,
  getFbVideoThumbnail,
  // Write operations
  updateFbCampaignStatus,
  updateFbCampaignBudget,
  updateFbAdSetStatus,
  updateFbAdStatus,
  deleteFbAd,
  uploadFbVideo,
  createFbCreative,
  createFbAd,
  // Error
  FacebookApiError,
  // Hook
  useFacebookCampaign,
} from './facebook';

export type {
  FbCampaign,
  FbAdSet,
  FbAd,
  FbCampaignData,
  FbCreative,
  FbVideoStatus,
  UseFacebookCampaignReturn,
} from './facebook';
