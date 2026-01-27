/**
 * Campaigns Controller
 *
 * The brain of the Campaigns feature. Owns ALL logic:
 * - List fetching via TanStack Query
 * - Filtering by status, product
 * - Search
 * - Readiness calculation per campaign
 *
 * Reusable by any page that needs campaign management.
 * Contains NO UI imports — pure logic only.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  Campaign,
  CampaignStatus,
  CampaignFilters,
  CampaignReadiness,
  ProductAssetAggregates,
} from './types';
import { listCampaigns, getProducts, createCampaign } from './data';
import {
  deriveCampaignReadiness,
  createEmptyReadiness,
  getReadinessLabel,
  getReadinessColor,
} from './readiness';
import { STATUS_LABELS as GLOBAL_STATUS_LABELS } from '../../constants';
import { sortByNameDesc } from '../../utils';

// =============================================================================
// CONSTANTS
// =============================================================================

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  Preparing: GLOBAL_STATUS_LABELS.preparing,
  Launched: GLOBAL_STATUS_LABELS.launched,
};

export const STATUS_OPTIONS: CampaignStatus[] = ['Preparing', 'Launched'];

// =============================================================================
// CONTROLLER RESULT TYPE
// =============================================================================

export interface UseCampaignsControllerResult {
  // Data
  campaigns: Campaign[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;

  // Create
  createCampaign: (name: string, productId: string) => Promise<void>;
  isCreating: boolean;

  // Filters
  filters: CampaignFilters;
  setFilters: (filters: CampaignFilters) => void;
  activeStatus: CampaignStatus | null;
  setStatusFilter: (status: CampaignStatus | null) => void;
  setProductFilter: (productId: string | null) => void;
  clearFilters: () => void;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Filtered results
  filteredCampaigns: Campaign[];

  // Status counts (from all campaigns, not filtered)
  statusCounts: {
    all: number;
    Preparing: number;
    Launched: number;
  };

  // Readiness
  getReadiness: (campaignId: string) => CampaignReadiness;
  getReadinessLabel: (campaignId: string) => string;
  getReadinessColor: (campaignId: string) => 'success' | 'warning' | 'error' | 'default';

  // Products (for filter dropdown)
  productOptions: { id: string; name: string }[];
}

// =============================================================================
// CONTROLLER HOOK
// =============================================================================

interface UseCampaignsControllerOptions {
  /**
   * Initial product ID filter.
   */
  initialProductId?: string | null;

  /**
   * Initial status filters.
   */
  initialStatus?: CampaignStatus[];

  /**
   * Product asset aggregates for readiness calculation.
   * TODO: This will come from a separate query in Phase 2.
   */
  productAggregates?: Map<string, ProductAssetAggregates>;
}

export function useCampaignsController(
  options: UseCampaignsControllerOptions = {}
): UseCampaignsControllerResult {
  const { initialProductId = null, initialStatus = [], productAggregates } = options;

  // ---------------------------------------------------------------------------
  // STATE (using proper React useState)
  // ---------------------------------------------------------------------------

  const [filters, setFilters] = useState<CampaignFilters>({
    status: initialStatus,
    productId: initialProductId,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------

  // Fetch all campaigns - filtering is done client-side for reliability
  const campaignsQuery = useQuery({
    queryKey: ['campaigns'],
    queryFn: listCampaigns,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch products for filter dropdown
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const campaigns = campaignsQuery.data ?? [];
  const productOptions = productsQuery.data ?? [];

  // ---------------------------------------------------------------------------
  // DERIVED: STATUS COUNTS
  // ---------------------------------------------------------------------------

  const statusCounts = useMemo(() => ({
    all: campaigns.length,
    Preparing: campaigns.filter((c) => c.status === 'Preparing').length,
    Launched: campaigns.filter((c) => c.status === 'Launched').length,
  }), [campaigns]);

  // ---------------------------------------------------------------------------
  // DERIVED: FILTERED CAMPAIGNS
  // ---------------------------------------------------------------------------

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;

    // Product filter - compare by product ID
    if (filters.productId) {
      result = result.filter((c) => c.product.id === filters.productId);
    }

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((c) => filters.status.includes(c.status));
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.product.name.toLowerCase().includes(term) ||
          c.description?.toLowerCase().includes(term)
      );
    }

    // Sort by name descending (Z→A)
    result = [...result].sort(sortByNameDesc);

    return result;
  }, [campaigns, filters.productId, filters.status, searchTerm]);

  // ---------------------------------------------------------------------------
  // DERIVED: READINESS
  // ---------------------------------------------------------------------------

  const readinessMap = useMemo(() => {
    const map = new Map<string, CampaignReadiness>();

    for (const campaign of campaigns) {
      const aggregates = productAggregates?.get(campaign.product.id);
      const readiness = deriveCampaignReadiness(campaign, aggregates);
      map.set(campaign.id, readiness);
    }

    return map;
  }, [campaigns, productAggregates]);

  const getReadiness = useCallback(
    (campaignId: string): CampaignReadiness => {
      return readinessMap.get(campaignId) ?? createEmptyReadiness();
    },
    [readinessMap]
  );

  const getReadinessLabelFn = useCallback(
    (campaignId: string): string => {
      const readiness = getReadiness(campaignId);
      return getReadinessLabel(readiness);
    },
    [getReadiness]
  );

  const getReadinessColorFn = useCallback(
    (campaignId: string): 'success' | 'warning' | 'error' | 'default' => {
      const readiness = getReadiness(campaignId);
      return getReadinessColor(readiness);
    },
    [getReadiness]
  );

  // ---------------------------------------------------------------------------
  // FILTER HANDLERS
  // ---------------------------------------------------------------------------

  const activeStatus = filters.status.length === 1 ? filters.status[0] : null;

  const handleSetStatusFilter = useCallback(
    (status: CampaignStatus | null) => {
      setFilters((prev) => ({
        ...prev,
        status: status ? [status] : [],
      }));
    },
    []
  );

  const handleSetProductFilter = useCallback(
    (productId: string | null) => {
      setFilters((prev) => ({
        ...prev,
        productId,
      }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      status: [],
      productId: null,
    });
    setSearchTerm('');
  }, []);

  // ---------------------------------------------------------------------------
  // CREATE HANDLER
  // ---------------------------------------------------------------------------

  const handleCreateCampaign = useCallback(
    async (name: string, productId: string): Promise<void> => {
      setIsCreating(true);
      try {
        await createCampaign(name, productId);
        await campaignsQuery.refetch();
      } finally {
        setIsCreating(false);
      }
    },
    [campaignsQuery]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    campaigns,
    isLoading: campaignsQuery.isLoading,
    isError: campaignsQuery.isError,
    error: campaignsQuery.error,
    refetch: campaignsQuery.refetch,

    // Create
    createCampaign: handleCreateCampaign,
    isCreating,

    // Filters
    filters,
    setFilters,
    activeStatus,
    setStatusFilter: handleSetStatusFilter,
    setProductFilter: handleSetProductFilter,
    clearFilters: handleClearFilters,

    // Search
    searchTerm,
    setSearchTerm,

    // Filtered results
    filteredCampaigns,

    // Status counts
    statusCounts,

    // Readiness
    getReadiness,
    getReadinessLabel: getReadinessLabelFn,
    getReadinessColor: getReadinessColorFn,

    // Products
    productOptions,
  };
}
