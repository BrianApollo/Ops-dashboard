/**
 * Redtrack Campaign List Hook
 *
 * Fetches all Redtrack campaigns for the selector.
 * Paginates through all pages and returns sorted list (newest first).
 */

import { useQuery } from '@tanstack/react-query';
import { fetchRedtrackCampaignList } from './api';
import type { RedTrackCampaignListItem } from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

// API key is now injected server-side by the proxy — this is a placeholder
const REDTRACK_API_KEY = 'proxy-managed' as string | undefined;
const PER_PAGE = 100; // Fetch 100 per page to minimize requests

// =============================================================================
// TYPES
// =============================================================================

export interface CampaignOption {
  id: string;
  name: string;
}

export interface UseRedtrackCampaignListResult {
  /** List of campaigns for selector */
  campaigns: CampaignOption[];
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

// =============================================================================
// FETCH ALL CAMPAIGNS
// =============================================================================

/**
 * Fetch all campaigns by paginating through the API.
 * Returns campaigns sorted newest to oldest (by MongoDB ObjectId).
 */
async function fetchAllCampaigns(apiKey: string): Promise<CampaignOption[]> {
  const allCampaigns: RedTrackCampaignListItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const batch = await fetchRedtrackCampaignList(apiKey, page, PER_PAGE);

    if (!batch || batch.length === 0) {
      hasMore = false;
    } else {
      allCampaigns.push(...batch);
      page++;

      // If we got less than PER_PAGE, we've reached the end
      if (batch.length < PER_PAGE) {
        hasMore = false;
      }
    }
  }

  // Sort by id descending (MongoDB ObjectIds are sortable by creation time)
  // Since id is a hex string, lexicographic sort works for descending order
  const sorted = allCampaigns.sort((a, b) => b.id.localeCompare(a.id));

  // Map to CampaignOption format
  return sorted.map((c) => ({
    id: c.id,
    name: c.title,
  }));
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to fetch all Redtrack campaigns for the selector.
 * Only fetches when enabled (e.g., when selector is opened).
 *
 * @param enabled - Whether to fetch campaigns (default: true)
 */
export function useRedtrackCampaignList(enabled: boolean = true): UseRedtrackCampaignListResult {
  const isConfigured = !!REDTRACK_API_KEY;

  const query = useQuery({
    queryKey: ['redtrack', 'campaigns', 'list'],
    queryFn: async () => {
      if (!REDTRACK_API_KEY) {
        throw new Error('Redtrack API key not configured');
      }
      return fetchAllCampaigns(REDTRACK_API_KEY);
    },
    enabled: isConfigured && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - campaign list doesn't change often
    retry: 1,
  });

  return {
    campaigns: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    isConfigured,
  };
}
