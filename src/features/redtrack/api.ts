/**
 * RedTrack API Client
 *
 * Pure API logic only - no React imports.
 * All methods are async and return typed responses.
 *
 * IMPORTANT: This module makes REAL API calls when enabled.
 * Use feature flag VITE_ENABLE_REAL_CAMPAIGN_LAUNCH to control.
 */

import type {
  RedTrackConfig,
  CreateRedTrackCampaignParams,
  RedTrackCampaign,
  RedTrackCampaignInfo,
  RedTrackCampaignApiResponse,
  RedTrackCampaignDetails,
  RedTrackCampaignListItem,
  RedTrackLander,
  RedTrackLanderApiResponse,
  RedTrackOffer,
  RedTrackOfferApiResponse,
  RedTrackStats,
  RedTrackDailyStats,
  TrackingUrls,
  RedTrackApiError,
  UpdateRedTrackCampaignParams,
  RedTrackReportParams,
  RedTrackReportRow,
} from './types';
import { extractTrackingParams } from './parseUtms';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Routes through server-side proxy at /api/redtrack/ — API key injected server-side
const DEFAULT_BASE_URL = '/api/redtrack/v1';

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class RedTrackApiException extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(error: RedTrackApiError) {
    super(error.message);
    this.name = 'RedTrackApiException';
    this.code = error.code;
    this.details = error.details;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

// =============================================================================
// API HELPERS
// =============================================================================

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  retryOnFailure?: boolean;
}

async function rtFetch<T>(
  config: RedTrackConfig,
  endpoint: string,
  options: RequestOptions
): Promise<T> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const url = `${baseUrl}${endpoint}`;

  const requestInit: RequestInit = {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Redtrack-Auth-Mode': 'bearer',
    },
  };

  if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
    requestInit.body = JSON.stringify(options.body);
  }

  const executeRequest = async (): Promise<T> => {
    const response = await fetch(url, requestInit);
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new RedTrackApiException(
        data.error ?? {
          code: `HTTP_${response.status}`,
          message: data.message ?? response.statusText,
        }
      );
    }

    return data.data ?? data;
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
 * Create a new campaign in RedTrack.
 */
export async function createCampaign(
  config: RedTrackConfig,
  params: CreateRedTrackCampaignParams
): Promise<RedTrackCampaign> {
  return rtFetch<RedTrackCampaign>(config, '/campaigns', {
    method: 'POST',
    body: {
      name: params.name,
      traffic_source_id: params.trafficSourceId,
      offer_id: params.offerId,
      landing_page_id: params.landingPageId,
      cost_model: params.costModel,
      default_cost: params.defaultCost,
      tags: params.tags,
    },
    retryOnFailure: true,
  });
}

/**
 * Get campaign by ID.
 */
export async function getCampaign(
  config: RedTrackConfig,
  campaignId: string
): Promise<RedTrackCampaign> {
  return rtFetch<RedTrackCampaign>(config, `/campaigns/${campaignId}`, {
    method: 'GET',
  });
}

/**
 * Update an existing campaign.
 */
export async function updateCampaign(
  config: RedTrackConfig,
  campaignId: string,
  params: UpdateRedTrackCampaignParams
): Promise<RedTrackCampaign> {
  return rtFetch<RedTrackCampaign>(config, `/campaigns/${campaignId}`, {
    method: 'PUT',
    body: {
      ...(params.name && { name: params.name }),
      ...(params.status && { status: params.status }),
      ...(params.defaultCost !== undefined && { default_cost: params.defaultCost }),
      ...(params.tags && { tags: params.tags }),
    },
    retryOnFailure: true,
  });
}

/**
 * Get tracking URLs for a campaign.
 */
export async function getTrackingUrls(
  config: RedTrackConfig,
  campaignId: string
): Promise<TrackingUrls> {
  return rtFetch<TrackingUrls>(config, `/campaigns/${campaignId}/tracking`, {
    method: 'GET',
  });
}

// =============================================================================
// STATS OPERATIONS
// =============================================================================

/**
 * Get campaign statistics.
 */
export async function getCampaignStats(
  config: RedTrackConfig,
  campaignId: string,
  dateRange?: { start: string; end: string }
): Promise<RedTrackStats> {
  const params = new URLSearchParams();
  if (dateRange) {
    params.set('start_date', dateRange.start);
    params.set('end_date', dateRange.end);
  }

  const queryString = params.toString();
  const endpoint = `/campaigns/${campaignId}/stats${queryString ? `?${queryString}` : ''}`;

  return rtFetch<RedTrackStats>(config, endpoint, {
    method: 'GET',
  });
}

/**
 * Get daily stats for a campaign.
 */
export async function getCampaignDailyStats(
  config: RedTrackConfig,
  campaignId: string,
  dateRange: { start: string; end: string }
): Promise<RedTrackDailyStats[]> {
  return rtFetch<RedTrackDailyStats[]>(
    config,
    `/campaigns/${campaignId}/stats/daily?start_date=${dateRange.start}&end_date=${dateRange.end}`,
    {
      method: 'GET',
    }
  );
}

// =============================================================================
// LINKING OPERATIONS
// =============================================================================

/**
 * Link a Facebook campaign to RedTrack.
 * This creates a relationship between the two campaigns for tracking.
 */
export async function linkFacebookCampaign(
  config: RedTrackConfig,
  redtrackCampaignId: string,
  facebookCampaignId: string,
  facebookAdAccountId: string
): Promise<{ linked: boolean; clickIdMacro: string }> {
  return rtFetch<{ linked: boolean; clickIdMacro: string }>(
    config,
    `/campaigns/${redtrackCampaignId}/integrations/facebook`,
    {
      method: 'POST',
      body: {
        facebook_campaign_id: facebookCampaignId,
        facebook_ad_account_id: facebookAdAccountId,
      },
      retryOnFailure: true,
    }
  );
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Get stats for multiple campaigns.
 */
export async function getBatchCampaignStats(
  config: RedTrackConfig,
  campaignIds: string[],
  dateRange?: { start: string; end: string }
): Promise<RedTrackStats[]> {
  return Promise.all(
    campaignIds.map((id) => getCampaignStats(config, id, dateRange))
  );
}

// =============================================================================
// FETCH OPERATIONS (using query param auth per API docs)
// =============================================================================

// Routes through server-side proxy — API key injected server-side
const REDTRACK_API_URL = '/api/redtrack';

/**
 * Fetch helper using api_key query parameter.
 */
async function rtApiFetch<T>(
  _apiKey: string,
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  // API key is now injected server-side by the proxy
  const url = new URL(`${REDTRACK_API_URL}${endpoint}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new RedTrackApiException({
      code: `HTTP_${response.status}`,
      message: errorText || response.statusText,
    });
  }

  const json = await response.json();

  // Handle both wrapped { data: [...] } and raw [...] responses
  if (Array.isArray(json)) {
    return json as T;
  }
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

// =============================================================================
// CAMPAIGN FETCH
// =============================================================================

/**
 * Fetch campaign by ID from Redtrack.
 * Uses GET /campaigns/{id}?api_key=...
 *
 * @param apiKey - Redtrack API key
 * @param campaignId - Hex string ID (e.g., "694584500a2ce266415e36d7")
 */
export async function fetchRedtrackCampaignById(
  apiKey: string,
  campaignId: string
): Promise<RedTrackCampaignInfo | null> {
  try {
    const raw = await rtApiFetch<RedTrackCampaignApiResponse>(
      apiKey,
      `/campaigns/${campaignId}`
    );

    // Extract lander/offer IDs from first stream if available
    const firstStream = raw.streams?.[0]?.stream;
    const landerId = firstStream?.landings?.[0]?.id;
    const offerId = firstStream?.offers?.[0]?.id;

    return {
      id: raw._id,
      title: raw.name,
      trackbackUrl: raw.trackback_url,
      status: raw.status,
      landerId,
      offerId,
    };
  } catch (error) {
    console.error('Failed to fetch Redtrack campaign:', error);
    return null;
  }
}

/**
 * Fetch campaigns list (paginated).
 * Uses GET /campaigns?api_key=...&page=X&per=Y
 */
export async function fetchRedtrackCampaignList(
  apiKey: string,
  page: number = 1,
  perPage: number = 50
): Promise<RedTrackCampaignListItem[]> {
  try {
    const raw = await rtApiFetch<RedTrackCampaignListItem[]>(
      apiKey,
      '/campaigns',
      { page: page.toString(), per: perPage.toString() }
    );
    return raw;
  } catch (error) {
    console.error('Failed to fetch Redtrack campaign list:', error);
    return [];
  }
}

// =============================================================================
// LANDER FETCH
// =============================================================================

/**
 * Fetch landing page by ID.
 * Uses GET /landings/{id}?api_key=...
 */
export async function fetchRedtrackLander(
  apiKey: string,
  landerId: string
): Promise<RedTrackLander | null> {
  try {
    const raw = await rtApiFetch<RedTrackLanderApiResponse>(
      apiKey,
      `/landings/${landerId}`
    );

    return {
      id: raw._id,
      title: raw.name,
      url: raw.url,
      status: raw.status === 'active' ? 'active' : 'disabled',
    };
  } catch (error) {
    console.error('Failed to fetch Redtrack lander:', error);
    return null;
  }
}

// =============================================================================
// OFFER FETCH
// =============================================================================

/**
 * Fetch offer by ID.
 * Uses GET /offers/{id}?api_key=...
 */
export async function fetchRedtrackOffer(
  apiKey: string,
  offerId: string
): Promise<RedTrackOffer | null> {
  try {
    const raw = await rtApiFetch<RedTrackOfferApiResponse>(
      apiKey,
      `/offers/${offerId}`
    );

    return {
      id: raw._id,
      title: raw.name,
      url: raw.url,
      payout: raw.payout,
      status: raw.status === 'active' ? 'active' : 'disabled',
    };
  } catch (error) {
    console.error('Failed to fetch Redtrack offer:', error);
    return null;
  }
}

// =============================================================================
// COMBINED FETCH
// =============================================================================

/**
 * Fetch full campaign details including landers and offers.
 * Chains API calls: campaign -> lander -> offer
 *
 * @param apiKey - Redtrack API key
 * @param campaignId - Hex string ID
 */
export async function fetchRedtrackCampaignDetails(
  apiKey: string,
  campaignId: string
): Promise<RedTrackCampaignDetails | null> {
  // 1. Fetch campaign
  const campaign = await fetchRedtrackCampaignById(apiKey, campaignId);
  if (!campaign) {
    return null;
  }

  // 2. Fetch lander if ID available
  const landers: RedTrackLander[] = [];
  if (campaign.landerId) {
    const lander = await fetchRedtrackLander(apiKey, campaign.landerId);
    if (lander) {
      landers.push(lander);
    }
  }

  // 3. Fetch offer if ID available
  const offers: RedTrackOffer[] = [];
  if (campaign.offerId) {
    const offer = await fetchRedtrackOffer(apiKey, campaign.offerId);
    if (offer) {
      offers.push(offer);
    }
  }

  // 4. Extract tracking parameters from trackback URL
  const trackingParams = extractTrackingParams(campaign.trackbackUrl);

  return {
    campaign,
    landers,
    offers,
    trackingParams,
  };
}

// =============================================================================
// REPORT OPERATIONS
// =============================================================================

/**
 * Fetch report data for a campaign.
 * Uses GET /report?api_key=...&campaign_id=...&group=...&date_from=...&date_to=...
 *
 * @param apiKey - RedTrack API key
 * @param params - Report parameters
 */
export async function fetchRedtrackReport(
  _apiKey: string,
  params: RedTrackReportParams
): Promise<RedTrackReportRow[]> {
  // API key is now injected server-side by the proxy
  const url = new URL(`${REDTRACK_API_URL}/report`, window.location.origin);
  url.searchParams.set('campaign_id', params.campaignId);
  url.searchParams.set('date_from', params.dateFrom);
  url.searchParams.set('date_to', params.dateTo);
  url.searchParams.set('group', params.group || 'date');

  if (params.timezone) {
    url.searchParams.set('timezone', params.timezone);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new RedTrackApiException({
      code: `HTTP_${response.status}`,
      message: errorText || response.statusText,
    });
  }

  const json = await response.json();
  console.log(json);
  // Handle response format - could be array or { data: [...] }
  const rawData = Array.isArray(json) ? json : (json.data || []);

  // Map raw API response to our typed structure with defaults
  return rawData.map((row: Record<string, unknown>): RedTrackReportRow => ({
    date: row.date as string | undefined,
    campaign_id: row.campaign_id as string | undefined,
    campaign_name: row.campaign_name as string | undefined,
    cost: Number(row.cost) || 0,
    conversions: Number(row.total_conversions) || 0,
    revenue: Number(row.total_revenue) || 0,
    roas: Number(row.roas) || 0,
    roi: Number(row.roi) || 0,
    cpa: Number(row.cpa) || 0,
    aov: Number(row.aov) || 0,
    epc: Number(row.epc) || 0,
    clicks: Number(row.clicks) || 0,
    lp_clicks: Number(row.lp_clicks) || 0,
    lp_ctr: Number(row.lp_ctr) || 0,
    cr: Number(row.cr) || 0,
  }));
}
