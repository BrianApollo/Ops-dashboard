/**
 * Facebook Marketing API Types
 *
 * Type definitions for Facebook Marketing API integration.
 * Based on Facebook Marketing API v18.0
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface FacebookConfig {
  accessToken: string;
  adAccountId: string;  // Format: act_XXXXXXXXX
  pageId?: string;
  pixelId?: string;
  apiVersion?: string;  // Default: v18.0
}

// =============================================================================
// CAMPAIGN TYPES
// =============================================================================

export type CampaignObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_APP_PROMOTION';

export type CampaignStatus = 'ACTIVE' | 'PAUSED';

export interface CreateCampaignParams {
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  specialAdCategories?: string[];
  dailyBudget?: number;  // In cents
  lifetimeBudget?: number;  // In cents
}

export interface FacebookCampaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  created_time: string;
  updated_time: string;
}

// =============================================================================
// AD SET TYPES
// =============================================================================

export type BillingEvent = 'IMPRESSIONS' | 'LINK_CLICKS' | 'APP_INSTALLS';
export type OptimizationGoal =
  | 'IMPRESSIONS'
  | 'LINK_CLICKS'
  | 'LANDING_PAGE_VIEWS'
  | 'CONVERSIONS'
  | 'VALUE';

export interface GeoTargeting {
  countries: string[];
  regions?: Array<{ key: string }>;
  cities?: Array<{ key: string; radius?: number }>;
}

export interface Targeting {
  geo_locations: GeoTargeting;
  age_min?: number;
  age_max?: number;
  genders?: number[];  // 1 = male, 2 = female
  locales?: number[];
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
}

export interface CreateAdSetParams {
  name: string;
  campaignId: string;
  status: CampaignStatus;
  dailyBudget?: number;  // In cents
  lifetimeBudget?: number;  // In cents
  billingEvent: BillingEvent;
  optimizationGoal: OptimizationGoal;
  targeting: Targeting;
  startTime?: string;  // ISO 8601
  endTime?: string;  // ISO 8601
  bidAmount?: number;  // In cents
}

export interface FacebookAdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: CampaignStatus;
  daily_budget?: string;
  lifetime_budget?: string;
  billing_event: BillingEvent;
  optimization_goal: OptimizationGoal;
  targeting: Targeting;
  created_time: string;
  updated_time: string;
}

// =============================================================================
// AD CREATIVE TYPES
// =============================================================================

export interface VideoData {
  video_id?: string;
  image_url?: string;  // Thumbnail
  title?: string;
  message?: string;
  link_description?: string;
  call_to_action?: {
    type: string;
    value: { link: string };
  };
}

export interface ImageData {
  image_hash?: string;
  image_url?: string;
}

export interface ObjectStorySpec {
  page_id: string;
  link_data?: {
    image_hash?: string;
    link: string;
    message?: string;
    name?: string;
    description?: string;
    call_to_action?: {
      type: string;
      value?: { link?: string };
    };
  };
  video_data?: VideoData;
}

export interface CreateAdCreativeParams {
  name: string;
  objectStorySpec: ObjectStorySpec;
}

export interface FacebookAdCreative {
  id: string;
  name: string;
  object_story_spec: ObjectStorySpec;
}

// =============================================================================
// AD TYPES
// =============================================================================

export interface CreateAdParams {
  name: string;
  adSetId: string;
  creativeId: string;
  status: CampaignStatus;
  trackingSpecs?: Array<{
    'action.type': string[];
    fb_pixel?: string[];
  }>;
}

export interface FacebookAd {
  id: string;
  name: string;
  adset_id: string;
  creative: { id: string };
  status: CampaignStatus;
  created_time: string;
  updated_time: string;
}

// =============================================================================
// MEDIA TYPES
// =============================================================================

export interface UploadVideoParams {
  fileUrl: string;  // Direct download URL
  title?: string;
  description?: string;
}

export interface FacebookVideo {
  id: string;
  title?: string;
  description?: string;
  length?: number;
  created_time: string;
}

export interface UploadImageParams {
  imageUrl: string;  // Direct download URL
  name?: string;
}

export interface FacebookImage {
  hash: string;
  url: string;
  name?: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface FacebookApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export interface FacebookApiResponse<T> {
  data?: T;
  error?: FacebookApiError;
}

// =============================================================================
// UPDATE TYPES
// =============================================================================

export interface UpdateCampaignParams {
  status?: CampaignStatus;
  name?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
}

export interface UpdateAdSetParams {
  status?: CampaignStatus;
  name?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  targeting?: Targeting;
  startTime?: string;
  endTime?: string;
}

export interface UpdateAdParams {
  status?: CampaignStatus;
  name?: string;
  creativeId?: string;
}
