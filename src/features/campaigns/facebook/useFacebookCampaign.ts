/**
 * useFacebookCampaign Hook
 *
 * React Query hook for fetching and managing Facebook campaign data.
 * Used by CampaignViewPage to display and manage launched campaigns.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFbCampaignData,
  updateFbCampaignStatus,
  updateFbCampaignBudget,
  updateFbAdStatus,
  type FbCampaignData,
} from './facebookCampaignApi';

// =============================================================================
// TYPES
// =============================================================================

export interface UseFacebookCampaignReturn {
  /** Campaign data from Facebook */
  data: FbCampaignData | undefined;
  /** Whether data is loading */
  isLoading: boolean;
  /** Whether there was an error */
  isError: boolean;
  /** Error message if any */
  error: Error | null;
  /** Refetch campaign data */
  refetch: () => void;
  /** Toggle campaign status (ACTIVE/PAUSED) */
  toggleStatus: {
    mutate: (status: 'ACTIVE' | 'PAUSED') => void;
    isPending: boolean;
  };
  /** Update campaign budget */
  updateBudget: {
    mutate: (dailyBudgetDollars: number) => void;
    isPending: boolean;
  };
  /** Toggle ad status */
  toggleAdStatus: {
    mutate: (params: { adId: string; status: 'ACTIVE' | 'PAUSED' }) => void;
    isPending: boolean;
  };
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for fetching and managing Facebook campaign data.
 *
 * @param fbCampaignId - The Facebook campaign ID
 * @param accessToken - Facebook access token (from profile)
 * @returns Campaign data and management functions
 *
 * @example
 * ```tsx
 * const fbData = useFacebookCampaign(campaign?.fbCampaignId, profile?.permanentToken);
 *
 * if (fbData.isLoading) return <Loading />;
 * if (fbData.isError) return <Error message={fbData.error?.message} />;
 *
 * return (
 *   <div>
 *     <h1>{fbData.data?.campaign.name}</h1>
 *     <button onClick={() => fbData.toggleStatus.mutate('PAUSED')}>
 *       Pause Campaign
 *     </button>
 *   </div>
 * );
 * ```
 */
export function useFacebookCampaign(
  fbCampaignId: string | undefined,
  accessToken: string | undefined
): UseFacebookCampaignReturn {
  const queryClient = useQueryClient();

  // Query for fetching campaign data
  const query = useQuery({
    queryKey: ['fb-campaign', fbCampaignId],
    queryFn: () => getFbCampaignData(fbCampaignId!, accessToken!),
    enabled: !!fbCampaignId && !!accessToken,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  // Mutation for toggling campaign status
  const toggleStatusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'PAUSED') =>
      updateFbCampaignStatus(fbCampaignId!, status, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb-campaign', fbCampaignId] });
    },
  });

  // Mutation for updating budget
  const updateBudgetMutation = useMutation({
    mutationFn: (dailyBudgetDollars: number) =>
      updateFbCampaignBudget(fbCampaignId!, Math.round(dailyBudgetDollars * 100), accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb-campaign', fbCampaignId] });
    },
  });

  // Mutation for toggling ad status
  const toggleAdStatusMutation = useMutation({
    mutationFn: ({ adId, status }: { adId: string; status: 'ACTIVE' | 'PAUSED' }) =>
      updateFbAdStatus(adId, status, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb-campaign', fbCampaignId] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => query.refetch(),
    toggleStatus: {
      mutate: toggleStatusMutation.mutate,
      isPending: toggleStatusMutation.isPending,
    },
    updateBudget: {
      mutate: updateBudgetMutation.mutate,
      isPending: updateBudgetMutation.isPending,
    },
    toggleAdStatus: {
      mutate: toggleAdStatusMutation.mutate,
      isPending: toggleAdStatusMutation.isPending,
    },
  };
}
