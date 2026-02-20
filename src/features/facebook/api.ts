/**
 * Facebook Marketing API Client
 *
 * Pure API logic only - no React imports.
 * All methods are async and return typed responses.
 *
 * IMPORTANT: This module makes REAL API calls when enabled.
 * Use feature flag VITE_ENABLE_REAL_CAMPAIGN_LAUNCH to control.
 */

import type {
  FacebookConfig,
  CreateCampaignParams,
  FacebookCampaign,
  CreateAdSetParams,
  FacebookAdSet,
  CreateAdCreativeParams,
  FacebookAdCreative,
  CreateAdParams,
  FacebookAd,
  UploadVideoParams,
  FacebookVideo,
  UploadImageParams,
  FacebookImage,
  FacebookApiError,
  UpdateCampaignParams,
  UpdateAdSetParams,
  UpdateAdParams,
  CampaignStatus,
} from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const FB_API_VERSION = 'v21.0';
const FB_GRAPH_URL = 'https://graph.facebook.com';

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class FacebookApiException extends Error {
  public readonly code: number;
  public readonly errorType: string;
  public readonly errorSubcode?: number;
  public readonly fbtraceId?: string;

  constructor(error: FacebookApiError) {
    super(error.message);
    this.name = 'FacebookApiException';
    this.code = error.code;
    this.errorType = error.type;
    this.errorSubcode = error.error_subcode;
    this.fbtraceId = error.fbtrace_id;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      errorType: this.errorType,
      errorSubcode: this.errorSubcode,
      fbtraceId: this.fbtraceId,
    };
  }
}

// =============================================================================
// API HELPERS
// =============================================================================

interface RequestOptions {
  method: 'GET' | 'POST' | 'DELETE';
  body?: Record<string, unknown>;
  retryOnFailure?: boolean;
}

async function fbFetch<T>(
  config: FacebookConfig,
  endpoint: string,
  options: RequestOptions
): Promise<T> {
  const apiVersion = config.apiVersion ?? FB_API_VERSION;
  const url = new URL(`${FB_GRAPH_URL}/${apiVersion}/${endpoint}`);

  const requestInit: RequestInit = {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add access token to body for POST, to URL for GET
  const bodyWithToken = {
    access_token: config.accessToken,
    ...options.body,
  };

  if (options.method === 'POST') {
    requestInit.body = JSON.stringify(bodyWithToken);
  } else {
    url.searchParams.set('access_token', config.accessToken);
    if (options.body) {
      Object.entries(options.body).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }
  }

  const executeRequest = async (): Promise<T> => {
    const response = await fetch(url.toString(), requestInit);
    const data = await response.json();

    if (data.error) {
      throw new FacebookApiException(data.error);
    }

    return data as T;
  };

  // Retry once on failure if enabled
  if (options.retryOnFailure) {
    try {
      return await executeRequest();
    } catch (error) {
      // Wait 1 second before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await executeRequest();
    }
  }

  return executeRequest();
}

// =============================================================================
// CAMPAIGN OPERATIONS
// =============================================================================

/**
 * Create a new campaign in Facebook Ads Manager.
 */
export async function createCampaign(
  config: FacebookConfig,
  params: CreateCampaignParams
): Promise<FacebookCampaign> {
  const response = await fbFetch<{ id: string }>(config, `${config.adAccountId}/campaigns`, {
    method: 'POST',
    body: {
      name: params.name,
      objective: params.objective,
      status: params.status,
      special_ad_categories: params.specialAdCategories ?? [],
      ...(params.dailyBudget && { daily_budget: params.dailyBudget }),
      ...(params.lifetimeBudget && { lifetime_budget: params.lifetimeBudget }),
    },
    retryOnFailure: true,
  });

  // Fetch the created campaign details
  return fbFetch<FacebookCampaign>(config, response.id, {
    method: 'GET',
    body: {
      fields: 'id,name,objective,status,created_time,updated_time',
    },
  });
}

/**
 * Update an existing campaign.
 */
export async function updateCampaign(
  config: FacebookConfig,
  campaignId: string,
  params: UpdateCampaignParams
): Promise<FacebookCampaign> {
  const body: Record<string, unknown> = {};

  if (params.status !== undefined) body.status = params.status;
  if (params.name !== undefined) body.name = params.name;
  if (params.dailyBudget !== undefined) body.daily_budget = params.dailyBudget;
  if (params.lifetimeBudget !== undefined) body.lifetime_budget = params.lifetimeBudget;

  await fbFetch<{ success: boolean }>(config, campaignId, {
    method: 'POST',
    body,
    retryOnFailure: true,
  });

  // Return updated campaign
  return fbFetch<FacebookCampaign>(config, campaignId, {
    method: 'GET',
    body: {
      fields: 'id,name,objective,status,created_time,updated_time',
    },
  });
}

/**
 * Get campaign by ID.
 */
export async function getCampaign(
  config: FacebookConfig,
  campaignId: string
): Promise<FacebookCampaign> {
  return fbFetch<FacebookCampaign>(config, campaignId, {
    method: 'GET',
    body: {
      fields: 'id,name,objective,status,created_time,updated_time',
    },
  });
}

// =============================================================================
// AD SET OPERATIONS
// =============================================================================

/**
 * Create a new ad set within a campaign.
 */
export async function createAdSet(
  config: FacebookConfig,
  params: CreateAdSetParams
): Promise<FacebookAdSet> {
  const response = await fbFetch<{ id: string }>(config, `${config.adAccountId}/adsets`, {
    method: 'POST',
    body: {
      name: params.name,
      campaign_id: params.campaignId,
      status: params.status,
      billing_event: params.billingEvent,
      optimization_goal: params.optimizationGoal,
      targeting: params.targeting,
      ...(params.dailyBudget && { daily_budget: params.dailyBudget }),
      ...(params.lifetimeBudget && { lifetime_budget: params.lifetimeBudget }),
      ...(params.startTime && { start_time: params.startTime }),
      ...(params.endTime && { end_time: params.endTime }),
      ...(params.bidAmount && { bid_amount: params.bidAmount }),
    },
    retryOnFailure: true,
  });

  // Fetch the created ad set details
  return fbFetch<FacebookAdSet>(config, response.id, {
    method: 'GET',
    body: {
      fields: 'id,name,campaign_id,status,daily_budget,lifetime_budget,billing_event,optimization_goal,targeting,created_time,updated_time',
    },
  });
}

/**
 * Update an existing ad set.
 */
export async function updateAdSet(
  config: FacebookConfig,
  adSetId: string,
  params: UpdateAdSetParams
): Promise<FacebookAdSet> {
  const body: Record<string, unknown> = {};

  if (params.status !== undefined) body.status = params.status;
  if (params.name !== undefined) body.name = params.name;
  if (params.dailyBudget !== undefined) body.daily_budget = params.dailyBudget;
  if (params.lifetimeBudget !== undefined) body.lifetime_budget = params.lifetimeBudget;
  if (params.targeting !== undefined) body.targeting = params.targeting;
  if (params.startTime !== undefined) body.start_time = params.startTime;
  if (params.endTime !== undefined) body.end_time = params.endTime;

  await fbFetch<{ success: boolean }>(config, adSetId, {
    method: 'POST',
    body,
    retryOnFailure: true,
  });

  return fbFetch<FacebookAdSet>(config, adSetId, {
    method: 'GET',
    body: {
      fields: 'id,name,campaign_id,status,daily_budget,lifetime_budget,billing_event,optimization_goal,targeting,created_time,updated_time',
    },
  });
}

// =============================================================================
// AD CREATIVE OPERATIONS
// =============================================================================

/**
 * Create an ad creative.
 */
export async function createAdCreative(
  config: FacebookConfig,
  params: CreateAdCreativeParams
): Promise<FacebookAdCreative> {
  const response = await fbFetch<{ id: string }>(config, `${config.adAccountId}/adcreatives`, {
    method: 'POST',
    body: {
      name: params.name,
      object_story_spec: params.objectStorySpec,
    },
    retryOnFailure: true,
  });

  return fbFetch<FacebookAdCreative>(config, response.id, {
    method: 'GET',
    body: {
      fields: 'id,name,object_story_spec',
    },
  });
}

// =============================================================================
// AD OPERATIONS
// =============================================================================

/**
 * Create an ad within an ad set.
 */
export async function createAd(
  config: FacebookConfig,
  params: CreateAdParams
): Promise<FacebookAd> {
  const body: Record<string, unknown> = {
    name: params.name,
    adset_id: params.adSetId,
    creative: { creative_id: params.creativeId },
    status: params.status,
  };

  if (params.trackingSpecs) {
    body.tracking_specs = params.trackingSpecs;
  }

  const response = await fbFetch<{ id: string }>(config, `${config.adAccountId}/ads`, {
    method: 'POST',
    body,
    retryOnFailure: true,
  });

  return fbFetch<FacebookAd>(config, response.id, {
    method: 'GET',
    body: {
      fields: 'id,name,adset_id,creative,status,created_time,updated_time',
    },
  });
}

/**
 * Update an existing ad.
 */
export async function updateAd(
  config: FacebookConfig,
  adId: string,
  params: UpdateAdParams
): Promise<FacebookAd> {
  const body: Record<string, unknown> = {};

  if (params.status !== undefined) body.status = params.status;
  if (params.name !== undefined) body.name = params.name;
  if (params.creativeId !== undefined) body.creative = { creative_id: params.creativeId };

  await fbFetch<{ success: boolean }>(config, adId, {
    method: 'POST',
    body,
    retryOnFailure: true,
  });

  return fbFetch<FacebookAd>(config, adId, {
    method: 'GET',
    body: {
      fields: 'id,name,adset_id,creative,status,created_time,updated_time',
    },
  });
}

// =============================================================================
// MEDIA OPERATIONS
// =============================================================================

/**
 * Upload a video from a direct download URL.
 * Facebook will download the video from the URL.
 */
export async function uploadVideo(
  config: FacebookConfig,
  params: UploadVideoParams
): Promise<FacebookVideo> {
  const response = await fbFetch<{ id: string }>(config, `${config.adAccountId}/advideos`, {
    method: 'POST',
    body: {
      file_url: params.fileUrl,
      ...(params.title && { title: params.title }),
      ...(params.description && { description: params.description }),
    },
    retryOnFailure: true,
  });

  return fbFetch<FacebookVideo>(config, response.id, {
    method: 'GET',
    body: {
      fields: 'id,title,description,length,created_time',
    },
  });
}

/**
 * Upload an image from a direct download URL.
 * Returns the image hash for use in creatives.
 */
export async function uploadImage(
  config: FacebookConfig,
  params: UploadImageParams
): Promise<FacebookImage> {
  const response = await fbFetch<{ images: Record<string, { hash: string; url: string }> }>(
    config,
    `${config.adAccountId}/adimages`,
    {
      method: 'POST',
      body: {
        url: params.imageUrl,
        ...(params.name && { name: params.name }),
      },
      retryOnFailure: true,
    }
  );

  // Extract the first image from the response
  const images = Object.values(response.images);
  if (images.length === 0) {
    throw new Error('No image returned from Facebook');
  }

  return {
    hash: images[0].hash,
    url: images[0].url,
    name: params.name,
  };
}

// =============================================================================
// EXISTING MEDIA LOOKUP (for reuse creatives feature)
// =============================================================================

export interface ExistingVideo {
  id: string;
  title: string;
  status: {
    video_status: string;
  };
  thumbnails?: {
    data: Array<{ uri: string; is_preferred?: boolean }>;
  };
}

export interface ExistingImage {
  hash: string;
  name: string;
  url: string;
}

/**
 * List existing videos in an ad account.
 * Used for reuse creatives feature to avoid re-uploading.
 */
export async function listExistingVideos(
  config: FacebookConfig,
  limit = 500
): Promise<ExistingVideo[]> {
  const response = await fbFetch<{ data: ExistingVideo[] }>(
    config,
    `${config.adAccountId}/advideos`,
    {
      method: 'GET',
      body: {
        fields: 'id,title,status,thumbnails',
        limit: limit.toString(),
      },
    }
  );
  return response.data || [];
}

/**
 * List existing images in an ad account.
 * Used for reuse creatives feature to avoid re-uploading.
 */
export async function listExistingImages(
  config: FacebookConfig,
  limit = 500
): Promise<ExistingImage[]> {
  const response = await fbFetch<{ data: ExistingImage[] }>(
    config,
    `${config.adAccountId}/adimages`,
    {
      method: 'GET',
      body: {
        fields: 'hash,name,url',
        limit: limit.toString(),
      },
    }
  );
  return response.data || [];
}

/**
 * Find an existing video by name.
 * Returns the video ID if found and ready, null otherwise.
 */
export function findExistingVideo(
  name: string,
  existingVideos: ExistingVideo[]
): { id: string; thumbnailUrl: string | null } | null {
  const normalizedName = name.toLowerCase().trim();

  const match = existingVideos.find((v) => {
    const title = (v.title || '').toLowerCase().trim();
    const isReady = v.status?.video_status === 'ready';
    return title === normalizedName && isReady;
  });

  if (match) {
    const thumbnail = match.thumbnails?.data?.find((t) => t.is_preferred)
      || match.thumbnails?.data?.[0];
    return {
      id: match.id,
      thumbnailUrl: thumbnail?.uri || null,
    };
  }

  return null;
}

/**
 * Find an existing image by name.
 * Returns the image hash if found, null otherwise.
 */
export function findExistingImage(
  name: string,
  existingImages: ExistingImage[]
): { hash: string } | null {
  const normalizedName = name.toLowerCase().trim();

  // Try exact match and variations with extensions
  const variations = [
    normalizedName,
    normalizedName + '.jpg',
    normalizedName + '.jpeg',
    normalizedName + '.png',
    normalizedName + '.gif',
  ];

  const match = existingImages.find((img) => {
    const imgName = (img.name || '').toLowerCase().trim();
    return variations.includes(imgName) || imgName.startsWith(normalizedName);
  });

  return match ? { hash: match.hash } : null;
}

// =============================================================================
// BULK STATUS UPDATE
// =============================================================================

/**
 * Update status of multiple campaigns at once (for pause/resume operations).
 */
export async function bulkUpdateCampaignStatus(
  config: FacebookConfig,
  campaignIds: string[],
  status: CampaignStatus
): Promise<void> {
  await Promise.all(
    campaignIds.map((id) => updateCampaign(config, id, { status }))
  );
}

/**
 * Update status of multiple ad sets at once.
 */
export async function bulkUpdateAdSetStatus(
  config: FacebookConfig,
  adSetIds: string[],
  status: CampaignStatus
): Promise<void> {
  await Promise.all(
    adSetIds.map((id) => updateAdSet(config, id, { status }))
  );
}
