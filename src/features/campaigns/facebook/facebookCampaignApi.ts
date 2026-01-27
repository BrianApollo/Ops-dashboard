/**
 * Facebook Campaign API
 *
 * Full CRUD operations for Facebook campaigns, ad sets, ads, and creatives.
 * Used by CampaignViewPage to display and manage launched campaigns.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const FB_API_VERSION = 'v21.0';
const FB_GRAPH_URL = 'https://graph.facebook.com';

// =============================================================================
// TYPES
// =============================================================================

export interface FbCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  daily_budget?: string;
  lifetime_budget?: string;
  objective: string;
  created_time: string;
  updated_time: string;
}

export interface FbAdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  daily_budget?: string;
  lifetime_budget?: string;
  optimization_goal?: string;
  created_time: string;
}

export interface FbAd {
  id: string;
  name: string;
  adset_id: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  creative?: {
    id: string;
    thumbnail_url?: string;
  };
  created_time: string;
}

export interface FbCampaignData {
  campaign: FbCampaign;
  adSets: FbAdSet[];
  ads: FbAd[];
}

export interface FbCreative {
  id: string;
  name?: string;
  object_story_spec?: {
    page_id?: string;
    instagram_user_id?: string;
    video_data?: {
      video_id?: string;
      image_url?: string;
      call_to_action?: {
        type: string;
        value?: { link?: string };
      };
    };
  };
  asset_feed_spec?: {
    bodies?: Array<{ text: string }>;
    titles?: Array<{ text: string }>;
    descriptions?: Array<{ text: string }>;
  };
  degrees_of_freedom_spec?: unknown;
  url_tags?: string;
  thumbnail_url?: string;
}

export interface FbVideoStatus {
  status: {
    video_status: 'ready' | 'processing' | 'error';
  };
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class FacebookApiError extends Error {
  public readonly code: number;
  public readonly errorType: string;

  constructor(message: string, code: number, errorType: string) {
    super(message);
    this.name = 'FacebookApiError';
    this.code = code;
    this.errorType = errorType;
  }
}

// =============================================================================
// API HELPERS
// =============================================================================

async function fbGet<T>(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${FB_GRAPH_URL}/${FB_API_VERSION}/${endpoint}`);
  url.searchParams.set('access_token', accessToken);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new FacebookApiError(
      data.error.message,
      data.error.code,
      data.error.type
    );
  }

  return data as T;
}

async function fbPost<T>(
  endpoint: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<T> {
  const url = new URL(`${FB_GRAPH_URL}/${FB_API_VERSION}/${endpoint}`);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: accessToken,
      ...body,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new FacebookApiError(
      data.error.message,
      data.error.code,
      data.error.type
    );
  }

  return data as T;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get campaign details from Facebook.
 */
export async function getFbCampaign(
  campaignId: string,
  accessToken: string
): Promise<FbCampaign> {
  return fbGet<FbCampaign>(campaignId, accessToken, {
    fields: 'id,name,status,daily_budget,lifetime_budget,objective,created_time,updated_time',
  });
}

/**
 * Get all ad sets for a campaign.
 */
export async function getFbAdSets(
  campaignId: string,
  accessToken: string
): Promise<FbAdSet[]> {
  interface Response {
    data: FbAdSet[];
  }

  const result = await fbGet<Response>(`${campaignId}/adsets`, accessToken, {
    fields: 'id,name,campaign_id,status,daily_budget,lifetime_budget,optimization_goal,created_time',
  });

  return result.data || [];
}

/**
 * Get all ads for a campaign.
 */
export async function getFbAds(
  campaignId: string,
  accessToken: string
): Promise<FbAd[]> {
  interface Response {
    data: FbAd[];
  }

  const result = await fbGet<Response>(`${campaignId}/ads`, accessToken, {
    fields: 'id,name,adset_id,status,creative{id,thumbnail_url},created_time',
  });

  return result.data || [];
}

/**
 * Get complete campaign data including ad sets and ads.
 */
export async function getFbCampaignData(
  campaignId: string,
  accessToken: string
): Promise<FbCampaignData> {
  const [campaign, adSets, ads] = await Promise.all([
    getFbCampaign(campaignId, accessToken),
    getFbAdSets(campaignId, accessToken),
    getFbAds(campaignId, accessToken),
  ]);

  return { campaign, adSets, ads };
}

/**
 * Get creative details.
 */
export async function getFbCreative(
  creativeId: string,
  accessToken: string
): Promise<FbCreative> {
  return fbGet<FbCreative>(creativeId, accessToken, {
    fields: 'id,name,object_story_spec,thumbnail_url,instagram_actor_id,asset_feed_spec,degrees_of_freedom_spec,url_tags',
  });
}

/**
 * Get video status (for polling during upload).
 */
export async function getFbVideoStatus(
  videoId: string,
  accessToken: string
): Promise<FbVideoStatus> {
  return fbGet<FbVideoStatus>(videoId, accessToken, {
    fields: 'status',
  });
}

/**
 * Get video thumbnail URL.
 */
export async function getFbVideoThumbnail(
  videoId: string,
  accessToken: string
): Promise<string | null> {
  interface ThumbnailResponse {
    thumbnails?: {
      data?: Array<{ uri: string; is_preferred?: boolean }>;
    };
  }

  const result = await fbGet<ThumbnailResponse>(videoId, accessToken, {
    fields: 'thumbnails',
  });

  if (result.thumbnails?.data?.length) {
    const preferred = result.thumbnails.data.find(t => t.is_preferred);
    return preferred?.uri || result.thumbnails.data[0]?.uri || null;
  }
  return null;
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Update campaign status (ACTIVE or PAUSED).
 */
export async function updateFbCampaignStatus(
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED',
  accessToken: string
): Promise<void> {
  await fbPost<{ success: boolean }>(campaignId, accessToken, { status });
}

/**
 * Update campaign daily budget (in cents).
 */
export async function updateFbCampaignBudget(
  campaignId: string,
  dailyBudgetCents: number,
  accessToken: string
): Promise<void> {
  await fbPost<{ success: boolean }>(campaignId, accessToken, {
    daily_budget: dailyBudgetCents,
  });
}

/**
 * Update ad set status.
 */
export async function updateFbAdSetStatus(
  adSetId: string,
  status: 'ACTIVE' | 'PAUSED',
  accessToken: string
): Promise<void> {
  await fbPost<{ success: boolean }>(adSetId, accessToken, { status });
}

/**
 * Update ad status.
 */
export async function updateFbAdStatus(
  adId: string,
  status: 'ACTIVE' | 'PAUSED',
  accessToken: string
): Promise<void> {
  await fbPost<{ success: boolean }>(adId, accessToken, { status });
}

/**
 * Delete an ad (sets status to DELETED).
 */
export async function deleteFbAd(
  adId: string,
  accessToken: string
): Promise<void> {
  await fbPost<{ success: boolean }>(adId, accessToken, { status: 'DELETED' });
}

/**
 * Upload a video from URL.
 */
export async function uploadFbVideo(
  adAccountId: string,
  fileUrl: string,
  title: string,
  accessToken: string
): Promise<{ id: string }> {
  return fbPost<{ id: string }>(`act_${adAccountId}/advideos`, accessToken, {
    file_url: fileUrl,
    title,
  });
}

/**
 * Create a new ad creative.
 */
export async function createFbCreative(
  adAccountId: string,
  params: {
    name: string;
    object_story_spec?: FbCreative['object_story_spec'];
    asset_feed_spec?: FbCreative['asset_feed_spec'];
    degrees_of_freedom_spec?: unknown;
    url_tags?: string;
  },
  accessToken: string
): Promise<{ id: string }> {
  return fbPost<{ id: string }>(`act_${adAccountId}/adcreatives`, accessToken, params);
}

/**
 * Create a new ad.
 */
export async function createFbAd(
  adAccountId: string,
  params: {
    name: string;
    adset_id: string;
    creative: { creative_id: string };
    status: 'ACTIVE' | 'PAUSED';
  },
  accessToken: string
): Promise<{ id: string }> {
  return fbPost<{ id: string }>(`act_${adAccountId}/ads`, accessToken, params);
}

