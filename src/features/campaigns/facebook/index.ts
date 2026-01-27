/**
 * Facebook Campaign Module
 *
 * API and hooks for reading/managing Facebook campaign data.
 */

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
} from './facebookCampaignApi';

export type {
  FbCampaign,
  FbAdSet,
  FbAd,
  FbCampaignData,
  FbCreative,
  FbVideoStatus,
} from './facebookCampaignApi';

export { useFacebookCampaign } from './useFacebookCampaign';
export type { UseFacebookCampaignReturn } from './useFacebookCampaign';
