/**
 * Redtrack Controller Hook
 *
 * Provides access to Redtrack campaign data for the launch page.
 * Uses TanStack Query for caching and automatic refetching.
 * Chains API calls: campaign -> lander -> offer
 */

import { useQuery } from '@tanstack/react-query';
import { fetchRedtrackCampaignDetails } from './api';
import type { RedTrackCampaignDetails, RedTrackLander, RedTrackOffer } from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

// API key is now injected server-side by the proxy — this is a placeholder
const REDTRACK_API_KEY = 'proxy-managed' as string | undefined;

// =============================================================================
// HOOK
// =============================================================================

export interface UseRedtrackCampaignResult {
  /** Full campaign details including landers and offers */
  data: RedTrackCampaignDetails | null;
  /** Campaign title */
  campaignTitle: string | null;
  /** Tracking parameters from trackback URL (cmpid + all query params) */
  trackingParams: string;
  /** Landers associated with the campaign */
  landers: RedTrackLander[];
  /** Offers associated with the campaign */
  offers: RedTrackOffer[];
  /** First lander URL (convenience) */
  landerUrl: string | null;
  /** First offer URL (convenience) */
  offerUrl: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  isError: boolean;
  /** Error object if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
  /** Whether Redtrack API is configured */
  isConfigured: boolean;
}

/**
 * Hook to fetch Redtrack campaign details by ID.
 * Returns campaign info, UTM parameters, landers (with URLs), and offers.
 *
 * @param campaignId - The Redtrack campaign ID (hex string like "694584500a2ce266415e36d7")
 */
export function useRedtrackCampaign(campaignId: string | null): UseRedtrackCampaignResult {
  const isConfigured = !!REDTRACK_API_KEY;
  // Campaign ID is a hex string - just check it's not empty
  const isValidId = !!campaignId && campaignId.trim().length > 0;

  const query = useQuery({
    queryKey: ['redtrack', 'campaign', campaignId],
    queryFn: async () => {
      if (!REDTRACK_API_KEY) {
        throw new Error('Redtrack API key not configured');
      }
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }
      return fetchRedtrackCampaignDetails(REDTRACK_API_KEY, campaignId);
    },
    enabled: isConfigured && isValidId,
    staleTime: 30_000, // 30 seconds
    retry: 1,
  });

  const landers = query.data?.landers ?? [];
  const offers = query.data?.offers ?? [];

  return {
    data: query.data ?? null,
    campaignTitle: query.data?.campaign?.title ?? null,
    trackingParams: query.data?.trackingParams ?? '',
    landers,
    offers,
    landerUrl: landers[0]?.url ?? null,
    offerUrl: offers[0]?.url ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    isConfigured,
  };
}
