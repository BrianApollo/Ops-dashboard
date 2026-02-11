/**
 * Infrastructure Data Controller
 *
 * Main data hook that fetches all 5 entity types from Airtable.
 * Returns typed data, loading states, and a refetchAll function.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listProfiles, listBMs, listAdAccounts, listPages, listPixels } from './data';
import type { InfraData } from './types';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useInfrastructureController() {
  const queryClient = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: ['infrastructure', 'profiles'],
    queryFn: listProfiles,
    staleTime: STALE_TIME,
  });

  const bmsQuery = useQuery({
    queryKey: ['infrastructure', 'bms'],
    queryFn: listBMs,
    staleTime: STALE_TIME,
  });

  const adAccountsQuery = useQuery({
    queryKey: ['infrastructure', 'adaccounts'],
    queryFn: listAdAccounts,
    staleTime: STALE_TIME,
  });

  const pagesQuery = useQuery({
    queryKey: ['infrastructure', 'pages'],
    queryFn: listPages,
    staleTime: STALE_TIME,
  });

  const pixelsQuery = useQuery({
    queryKey: ['infrastructure', 'pixels'],
    queryFn: listPixels,
    staleTime: STALE_TIME,
  });

  const isLoading =
    profilesQuery.isLoading ||
    bmsQuery.isLoading ||
    adAccountsQuery.isLoading ||
    pagesQuery.isLoading ||
    pixelsQuery.isLoading;

  const error =
    profilesQuery.error ||
    bmsQuery.error ||
    adAccountsQuery.error ||
    pagesQuery.error ||
    pixelsQuery.error;

  const data: InfraData = {
    profiles: profilesQuery.data ?? [],
    bms: bmsQuery.data ?? [],
    adaccounts: adAccountsQuery.data ?? [],
    pages: pagesQuery.data ?? [],
    pixels: pixelsQuery.data ?? [],
  };

  const refetchAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['infrastructure'] });
  };

  return {
    data,
    isLoading,
    error,
    refetchAll,
  };
}
