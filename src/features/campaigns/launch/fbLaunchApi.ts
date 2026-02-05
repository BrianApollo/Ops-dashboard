/**
 * Facebook API - Raw API calls
 *
 * This file contains only fetch calls to Facebook's Graph API.
 * No business logic, no state management, no retries.
 * Just: input → API call → output
 */

const BASE_URL = 'https://graph.facebook.com/v21.0';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  data: T;
  rate: number;
}

export interface FbErrorResponse {
  error?: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}

export interface FbCampaignResponse extends FbErrorResponse {
  id?: string;
}

export interface FbAdSetResponse extends FbErrorResponse {
  id?: string;
}

export interface FbBatchResponseItem {
  code: number;
  body: string;
}

export interface FbVideoUploadResponse {
  id?: string;
}

export interface FbVideoLibraryItem {
  id: string;
  title?: string;
  status?: {
    video_status: string;
  };
  picture?: string;
}

export interface FbVideoLibraryResponse {
  data?: FbVideoLibraryItem[];
}

export interface CampaignConfig {
  name: string;
  objective: string;
  status: string;
  specialAdCategories: string[];
  dailyBudget: number;
  bidStrategy: string;
}

export interface AdSetTargeting {
  geoLocations: {
    countries: string[];
  };
  ageMin: number;
  ageMax: number;
}

export interface AdSetPromotedObject {
  customEventType: string;
}

export interface AdSetConfig {
  name: string;
  optimizationGoal: string;
  billingEvent: string;
  status: string;
  targeting: AdSetTargeting;
  promotedObject: AdSetPromotedObject;
  startTime?: number | null;
  /** EU DSA compliance: beneficiary name (required for EU targeting) */
  beneficiaryName?: string;
  /** EU DSA compliance: payor name (defaults to beneficiary if not set) */
  payerName?: string;
}

export interface AdCreativeConfig {
  websiteUrl: string;
  urlTags: string;
  callToAction: string;
  bodies: string[];
  titles: string[];
  descriptions: string[];
  advantagePlusCreative: boolean;
  /** EU DSA compliance: beneficiary name (required for EU targeting) */
  beneficiaryName?: string;
  /** EU DSA compliance: payor name (defaults to beneficiary if not set) */
  payerName?: string;
  /** Ad status - ACTIVE or PAUSED */
  status?: 'ACTIVE' | 'PAUSED';
}

export interface VideoToSend {
  name: string;
  url: string;
}

export interface MediaItemForAd {
  type: 'video' | 'image';
  name: string;
  fbVideoId?: string | null;
  thumbnailUrl?: string | null;
  url?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract rate limit from response headers
 */
export function extractRate(response: Response): number {
  const usage = response.headers.get('x-app-usage');
  if (usage) {
    try {
      const parsed = JSON.parse(usage);
      return Math.max(
        parsed.call_count || 0,
        parsed.total_cputime || 0,
        parsed.total_time || 0
      );
    } catch {
      return 0;
    }
  }
  return 0;
}

/**
 * Make a request and return both data and rate
 */
async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(url, options);
  const data = await response.json() as T;
  const rate = extractRate(response);
  return { data, rate };
}

// =============================================================================
// RATE CHECK
// =============================================================================

/**
 * Get current API rate
 */
export async function getRate(accessToken: string): Promise<ApiResponse<unknown>> {
  return request(`${BASE_URL}/me?access_token=${accessToken}`);
}

// =============================================================================
// CAMPAIGN
// =============================================================================

/**
 * Create a campaign
 */
export async function createCampaign(
  accessToken: string,
  adAccountId: string,
  campaign: CampaignConfig
): Promise<ApiResponse<FbCampaignResponse>> {
  return request<FbCampaignResponse>(`${BASE_URL}/${adAccountId}/campaigns`, {
    method: 'POST',
    body: new URLSearchParams({
      access_token: accessToken,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      special_ad_categories: JSON.stringify(campaign.specialAdCategories),
      daily_budget: String(campaign.dailyBudget),
      bid_strategy: campaign.bidStrategy,
    }),
  });
}

// =============================================================================
// AD SET
// =============================================================================

/**
 * Create an ad set
 */
export async function createAdSet(
  accessToken: string,
  adAccountId: string,
  campaignId: string,
  adSet: AdSetConfig,
  pixelId: string
): Promise<ApiResponse<FbAdSetResponse>> {
  const startTime = adSet.startTime || Math.floor(Date.now() / 1000) + 3600;

  // DSA compliance: use provided names or fallback to generic
  const beneficiary = adSet.beneficiaryName || 'Online Marketing';
  const payor = adSet.payerName || beneficiary;

  return request<FbAdSetResponse>(`${BASE_URL}/${adAccountId}/adsets`, {
    method: 'POST',
    body: new URLSearchParams({
      access_token: accessToken,
      name: adSet.name,
      campaign_id: campaignId,
      optimization_goal: adSet.optimizationGoal,
      billing_event: adSet.billingEvent,
      status: adSet.status,
      targeting: JSON.stringify({
        geo_locations: { countries: adSet.targeting.geoLocations.countries },
        age_min: adSet.targeting.ageMin,
        age_max: adSet.targeting.ageMax,
      }),
      promoted_object: JSON.stringify({
        pixel_id: pixelId,
        custom_event_type: adSet.promotedObject.customEventType,
      }),
      start_time: String(startTime),
      dsa_beneficiary: beneficiary,
      dsa_payor: payor,
    }),
  });
}

// =============================================================================
// VIDEO UPLOAD
// =============================================================================

/**
 * Upload videos in a batch
 */
export async function uploadVideoBatch(
  accessToken: string,
  adAccountId: string,
  videos: VideoToSend[]
): Promise<ApiResponse<FbBatchResponseItem[]>> {
  const batchRequest = videos.map(video => ({
    method: 'POST',
    relative_url: `${adAccountId}/advideos`,
    body: `file_url=${video.url}&title=${encodeURIComponent(video.name)}`,
  }));

  return request<FbBatchResponseItem[]>(`${BASE_URL}/`, {
    method: 'POST',
    body: new URLSearchParams({
      access_token: accessToken,
      batch: JSON.stringify(batchRequest),
    }),
  });
}

// =============================================================================
// LIBRARY POLL / CHECK
// =============================================================================

/**
 * Poll library for video status by IDs
 */
export async function pollLibrary(
  accessToken: string,
  adAccountId: string,
  videoIds: string[]
): Promise<ApiResponse<FbVideoLibraryResponse>> {
  const filter = JSON.stringify([{ field: 'id', operator: 'IN', value: videoIds }]);
  const url = `${BASE_URL}/${adAccountId}/advideos?fields=id,status,picture&filtering=${encodeURIComponent(filter)}&access_token=${accessToken}`;
  return request<FbVideoLibraryResponse>(url);
}

/**
 * Check library for videos by name
 *
 * Facebook doesn't support filtering by title, so we fetch all videos
 * from the library and filter client-side.
 */
export async function checkLibraryByName(
  accessToken: string,
  adAccountId: string,
  videoNames: string[]
): Promise<ApiResponse<FbVideoLibraryResponse>> {
  const nameSet = new Set(videoNames);
  const matchedVideos: FbVideoLibraryItem[] = [];
  let lastRate = 0;
  let after: string | null = null;

  // Fetch all videos with pagination, filter client-side
  do {
    const url = `${BASE_URL}/${adAccountId}/advideos?fields=id,title,status,picture&limit=100${after ? `&after=${after}` : ''}&access_token=${accessToken}`;
    const response = await fetch(url);
    lastRate = extractRate(response);

    const data = await response.json() as {
      data?: FbVideoLibraryItem[];
      paging?: { cursors?: { after?: string } };
    };

    // Filter matching videos
    if (data.data) {
      for (const video of data.data) {
        if (video.title && nameSet.has(video.title)) {
          matchedVideos.push(video);
        }
      }
    }

    // Check if we found all videos we're looking for
    if (matchedVideos.length >= videoNames.length) {
      break;
    }

    // Get next page cursor
    after = data.paging?.cursors?.after || null;
  } while (after);

  return {
    data: { data: matchedVideos },
    rate: lastRate,
  };
}

// =============================================================================
// AD CREATION
// =============================================================================

interface VideoCreativeObject {
  name: string;
  object_story_spec: {
    page_id: string;
    video_data: {
      video_id: string;
      image_url: string;
      call_to_action: {
        type: string;
        value: { link: string };
      };
    };
  };
  url_tags: string;
  asset_feed_spec: {
    bodies: Array<{ text: string }>;
    titles: Array<{ text: string }>;
    descriptions: Array<{ text: string }>;
    optimization_type: string;
  };
  degrees_of_freedom_spec: {
    creative_features_spec: {
      advantage_plus_creative: {
        enroll_status: string;
      };
    };
  };
}

interface ImageCreativeObject {
  name: string;
  object_story_spec: {
    page_id: string;
    link_data: {
      picture: string;
      link: string;
      call_to_action: {
        type: string;
        value: { link: string };
      };
    };
  };
  url_tags: string;
  asset_feed_spec: {
    bodies: Array<{ text: string }>;
    titles: Array<{ text: string }>;
    descriptions: Array<{ text: string }>;
    optimization_type: string;
  };
  degrees_of_freedom_spec: {
    creative_features_spec: {
      advantage_plus_creative: {
        enroll_status: string;
      };
    };
  };
}

/**
 * Build creative object for a video ad
 */
export function buildVideoCreative(
  pageId: string,
  media: MediaItemForAd,
  adCreative: AdCreativeConfig
): VideoCreativeObject {
  return {
    name: `Creative-${media.name}`,
    object_story_spec: {
      page_id: pageId,
      video_data: {
        video_id: media.fbVideoId!,
        image_url: media.thumbnailUrl!,
        call_to_action: {
          type: adCreative.callToAction,
          value: { link: adCreative.websiteUrl },
        },
      },
    },
    url_tags: adCreative.urlTags,
    asset_feed_spec: {
      bodies: adCreative.bodies.map(text => ({ text })),
      titles: adCreative.titles.map(text => ({ text })),
      descriptions: adCreative.descriptions.map(text => ({ text })),
      optimization_type: 'DEGREES_OF_FREEDOM',
    },
    degrees_of_freedom_spec: {
      creative_features_spec: {
        advantage_plus_creative: {
          enroll_status: adCreative.advantagePlusCreative ? 'OPT_IN' : 'OPT_OUT',
        },
      },
    },
  };
}

/**
 * Build creative object for an image ad
 */
export function buildImageCreative(
  pageId: string,
  media: MediaItemForAd,
  adCreative: AdCreativeConfig
): ImageCreativeObject {
  return {
    name: `Creative-${media.name}`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        picture: media.url!,
        link: adCreative.websiteUrl,
        call_to_action: {
          type: adCreative.callToAction,
          value: { link: adCreative.websiteUrl },
        },
      },
    },
    url_tags: adCreative.urlTags,
    asset_feed_spec: {
      bodies: adCreative.bodies.map(text => ({ text })),
      titles: adCreative.titles.map(text => ({ text })),
      descriptions: adCreative.descriptions.map(text => ({ text })),
      optimization_type: 'DEGREES_OF_FREEDOM',
    },
    degrees_of_freedom_spec: {
      creative_features_spec: {
        advantage_plus_creative: {
          enroll_status: adCreative.advantagePlusCreative ? 'OPT_IN' : 'OPT_OUT',
        },
      },
    },
  };
}

/**
 * Create ads in a batch
 */
export async function createAdsBatch(
  accessToken: string,
  adAccountId: string,
  adsetId: string,
  pageId: string,
  mediaItems: MediaItemForAd[],
  adCreative: AdCreativeConfig
): Promise<ApiResponse<FbBatchResponseItem[]>> {
  const adStatus = adCreative.status || 'PAUSED';

  const batchRequest = mediaItems.map(media => {
    const creative = media.type === 'video'
      ? buildVideoCreative(pageId, media, adCreative)
      : buildImageCreative(pageId, media, adCreative);

    return {
      method: 'POST',
      relative_url: `${adAccountId}/ads`,
      body: `name=Ad-${encodeURIComponent(media.name)}&adset_id=${adsetId}&status=${adStatus}&creative=${encodeURIComponent(JSON.stringify(creative))}`,
    };
  });

  return request<FbBatchResponseItem[]>(`${BASE_URL}/`, {
    method: 'POST',
    body: new URLSearchParams({
      access_token: accessToken,
      batch: JSON.stringify(batchRequest),
    }),
  });
}
