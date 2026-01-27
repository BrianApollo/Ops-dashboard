/**
 * RedTrack API Types
 *
 * Type definitions for RedTrack tracking integration.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface RedTrackConfig {
  apiKey: string;
  baseUrl?: string;  // Default: https://api.redtrack.io
}

// =============================================================================
// LANDER TYPES
// =============================================================================

export interface RedTrackLander {
  id: string; // Hex string ID
  title: string;
  url: string;
  status?: 'active' | 'disabled';
}

/**
 * Raw API response from GET /landings/{id}
 */
export interface RedTrackLanderApiResponse {
  _id: string;
  name: string;
  url: string;
  status?: string;
  // Many other fields omitted
}

// =============================================================================
// OFFER TYPES
// =============================================================================

export interface RedTrackOffer {
  id: string; // Hex string ID
  title: string;
  url?: string;
  payout?: number;
  status?: 'active' | 'disabled';
}

/**
 * Raw API response from GET /offers/{id}
 */
export interface RedTrackOfferApiResponse {
  _id: string;
  name: string;
  url?: string;
  facebook_pixel_id?: string;
  facebook_pixel_name?: string;
  payout?: number;
  status?: string;
  // Many other fields omitted
}

// =============================================================================
// CAMPAIGN DETAILS (for UI display)
// =============================================================================

/**
 * Full campaign details with related entities for launch page display.
 */
export interface RedTrackCampaignDetails {
  campaign: RedTrackCampaignInfo;
  landers: RedTrackLander[];
  offers: RedTrackOffer[];
  trackingParams: string;
}

/**
 * Campaign info for UI display (normalized from API response).
 */
export interface RedTrackCampaignInfo {
  id: string; // Hex string ID (e.g., "694584500a2ce266415e36d7")
  title: string;
  trackbackUrl?: string; // Full URL with UTM params
  status?: string;
  // Extracted IDs from streams (if available)
  landerId?: string;
  offerId?: string;
}

/**
 * Stream item within campaign API response.
 */
export interface RedTrackCampaignStream {
  stream: {
    landings?: Array<{ id: string }>;
    offers?: Array<{ id: string }>;
  };
}

/**
 * Raw API response from GET /campaigns/{id}
 */
export interface RedTrackCampaignApiResponse {
  _id: string;
  name: string;
  trackback_url?: string;
  status?: string;
  streams?: RedTrackCampaignStream[];
  // Many other fields omitted
}

/**
 * Campaign list item from GET /campaigns?page=X
 */
export interface RedTrackCampaignListItem {
  id: string;
  title: string;
  status?: string;
}

// =============================================================================
// CAMPAIGN TYPES
// =============================================================================

export interface CreateRedTrackCampaignParams {
  name: string;
  trafficSourceId?: string;
  offerId?: string;
  landingPageId?: string;
  costModel?: 'cpc' | 'cpm' | 'cpa' | 'revshare';
  defaultCost?: number;
  tags?: string[];
}

export interface RedTrackCampaign {
  id: string;
  name: string;
  trafficSourceId?: string;
  offerId?: string;
  landingPageId?: string;
  trackingUrl: string;
  clickIdTemplate: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'paused' | 'archived';
}

// =============================================================================
// STATS TYPES
// =============================================================================

export interface RedTrackStats {
  campaignId: string;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  roas: number;  // Revenue / Cost
  cr: number;    // Conversion Rate
  epc: number;   // Earnings Per Click
  dateRange: {
    start: string;
    end: string;
  };
}

export interface RedTrackDailyStats {
  date: string;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
}

// =============================================================================
// TRACKING TYPES
// =============================================================================

export interface TrackingParams {
  clickId: string;
  subId1?: string;
  subId2?: string;
  subId3?: string;
  subId4?: string;
  subId5?: string;
}

export interface TrackingUrls {
  clickUrl: string;
  conversionUrl: string;
  postbackUrl: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface RedTrackApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface RedTrackApiResponse<T> {
  success: boolean;
  data?: T;
  error?: RedTrackApiError;
}

// =============================================================================
// UPDATE TYPES
// =============================================================================

export interface UpdateRedTrackCampaignParams {
  name?: string;
  status?: 'active' | 'paused' | 'archived';
  defaultCost?: number;
  tags?: string[];
}

// =============================================================================
// REPORT TYPES
// =============================================================================

export interface RedTrackReportParams {
  campaignId: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  group?: string; // e.g., "date" for daily grouping
  timezone?: string;
}

export interface RedTrackReportRow {
  // Grouping fields
  date?: string;
  campaign_id?: string;
  campaign_name?: string;

  // Core metrics
  cost: number;
  conversions: number; // Purchase count
  revenue: number; // Total revenue
  roas: number; // Revenue / Cost
  roi: number; // (Revenue - Cost) / Cost * 100

  // Extended metrics
  cpa: number; // Cost per acquisition (Cost / Conversions)
  aov: number; // Average order value (Revenue / Conversions)
  epc: number; // Earnings per click (Revenue / Clicks)
  clicks: number; // Total clicks
  lp_clicks: number; // Landing page clicks
  lp_ctr: number; // Landing page click-through rate
  cr: number; // Conversion rate (Conversions / Clicks * 100)
}
