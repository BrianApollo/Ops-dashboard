/**
 * Ad Presets Controller
 *
 * The brain of the Ad Presets feature. Owns ALL logic:
 * - List fetching via TanStack Query
 * - Filtering by status, product
 * - Search
 *
 * IMPORTANT: Ad Presets are reusable copy & config presets, NOT Facebook entities.
 * They are filtered strictly by Product and selectable only during campaign launch.
 *
 * Contains NO UI imports — pure logic only.
 */

import { useMemo, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  AdPreset,
  AdPresetStatus,
  AdPresetFilters,
} from './types';
import { listAdPresets, updateAdPreset, createAdPreset } from './data';
import type { AdPresetUpdatePayload } from './data';
import { STATUS_LABELS as GLOBAL_STATUS_LABELS } from '../../constants';
import { sortByNameDesc } from '../../utils';

// =============================================================================
// CONSTANTS
// =============================================================================

export const STATUS_LABELS: Record<AdPresetStatus, string> = {
  active: GLOBAL_STATUS_LABELS.active,
  paused: GLOBAL_STATUS_LABELS.paused,
  disabled: GLOBAL_STATUS_LABELS.disabled,
};

export const STATUS_OPTIONS: AdPresetStatus[] = ['active', 'paused', 'disabled'];

// =============================================================================
// CONTROLLER RESULT TYPE
// =============================================================================

export interface UseAdPresetsControllerResult {
  // Data
  adPresets: AdPreset[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;

  // Filters
  filters: AdPresetFilters;
  setFilters: (filters: AdPresetFilters) => void;
  activeStatus: AdPresetStatus | null;
  setStatusFilter: (status: AdPresetStatus | null) => void;
  setProductFilter: (productId: string | null) => void;
  clearFilters: () => void;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Filtered results
  filteredAdPresets: AdPreset[];

  // Status counts
  statusCounts: {
    all: number;
    active: number;
    paused: number;
    disabled: number;
  };

  // Selection
  selectedPresetId: string | null;
  setSelectedPresetId: (id: string | null) => void;
  selectedPreset: AdPreset | null;

  // Mutations
  savePreset: (id: string, payload: AdPresetUpdatePayload) => Promise<void>;
  createPreset: (productId: string) => Promise<AdPreset>;
  duplicatePreset: (presetId: string) => Promise<void>;
  isSaving: boolean;
  isCreating: boolean;
}

// =============================================================================
// CONTROLLER HOOK
// =============================================================================

interface UseAdPresetsControllerOptions {
  /**
   * Initial filters.
   */
  initialFilters?: Partial<AdPresetFilters>;
}

export function useAdPresetsController(
  options: UseAdPresetsControllerOptions = {}
): UseAdPresetsControllerResult {
  const { initialFilters } = options;

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [filters, setFilters] = useState<AdPresetFilters>({
    status: [],
    productId: null,
    ...initialFilters,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // ---------------------------------------------------------------------------
  // QUERY
  // ---------------------------------------------------------------------------

  const adPresetsQuery = useQuery({
    queryKey: ['ad-presets'],
    queryFn: listAdPresets,
    staleTime: 30 * 1000, // 30 seconds
  });

  const adPresets = adPresetsQuery.data ?? [];

  // ---------------------------------------------------------------------------
  // DERIVED: STATUS COUNTS
  // ---------------------------------------------------------------------------

  const statusCounts = useMemo(() => ({
    all: adPresets.length,
    active: adPresets.filter((p) => p.status === 'active').length,
    paused: adPresets.filter((p) => p.status === 'paused').length,
    disabled: adPresets.filter((p) => p.status === 'disabled').length,
  }), [adPresets]);

  // ---------------------------------------------------------------------------
  // DERIVED: FILTERED AD PRESETS
  // ---------------------------------------------------------------------------

  const filteredAdPresets = useMemo(() => {
    let result = adPresets;

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((p) => filters.status.includes(p.status));
    }

    // Product filter (Ad Presets are strictly filtered by Product)
    if (filters.productId) {
      result = result.filter((p) => p.product.id === filters.productId);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(term) ||
        p.headline1?.toLowerCase().includes(term) ||
        p.primaryText1?.toLowerCase().includes(term)
      );
    }

    // Sort by name descending (Z→A)
    result = [...result].sort(sortByNameDesc);

    return result;
  }, [adPresets, filters, searchTerm]);

  // ---------------------------------------------------------------------------
  // DERIVED: SELECTED PRESET
  // ---------------------------------------------------------------------------

  const selectedPreset = useMemo(() => {
    if (!selectedPresetId) return null;
    return adPresets.find((p) => p.id === selectedPresetId) ?? null;
  }, [adPresets, selectedPresetId]);

  // ---------------------------------------------------------------------------
  // FILTER HANDLERS
  // ---------------------------------------------------------------------------

  const activeStatus = filters.status.length === 1 ? filters.status[0] : null;

  const handleSetStatusFilter = useCallback((status: AdPresetStatus | null) => {
    setFilters((prev) => ({
      ...prev,
      status: status ? [status] : [],
    }));
  }, []);

  const handleSetProductFilter = useCallback((productId: string | null) => {
    setFilters((prev) => ({
      ...prev,
      productId,
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ status: [], productId: null });
    setSearchTerm('');
  }, []);

  // ---------------------------------------------------------------------------
  // SAVE HANDLER
  // ---------------------------------------------------------------------------

  const handleSavePreset = useCallback(async (id: string, payload: AdPresetUpdatePayload): Promise<void> => {
    setIsSaving(true);
    try {
      await updateAdPreset(id, payload);
      await adPresetsQuery.refetch();
    } finally {
      setIsSaving(false);
    }
  }, [adPresetsQuery]);

  // ---------------------------------------------------------------------------
  // CREATE HANDLER
  // ---------------------------------------------------------------------------

  const handleCreatePreset = useCallback(async (productId: string): Promise<AdPreset> => {
    // Count existing presets for this product to generate name
    const existingCount = adPresets.filter((p) => p.product.id === productId).length;
    const presetName = `Preset ${existingCount + 1}`;

    setIsCreating(true);
    try {
      const newPreset = await createAdPreset(productId, presetName);
      await adPresetsQuery.refetch();
      return newPreset;
    } finally {
      setIsCreating(false);
    }
  }, [adPresets, adPresetsQuery]);

  // ---------------------------------------------------------------------------
  // DUPLICATE HANDLER
  // ---------------------------------------------------------------------------

  const handleDuplicatePreset = useCallback(async (presetId: string): Promise<void> => {
    const original = adPresets.find((p) => p.id === presetId);
    if (!original) return;

    const presetName = `${original.name} - copy`;

    // Construct payload from original preset
    // We only include fields that are present in AdPresetUpdatePayload
    const payload: AdPresetUpdatePayload = {
      primaryText1: original.primaryText1,
      primaryText2: original.primaryText2,
      primaryText3: original.primaryText3,
      primaryText4: original.primaryText4,
      primaryText5: original.primaryText5,
      headline1: original.headline1,
      headline2: original.headline2,
      headline3: original.headline3,
      headline4: original.headline4,
      headline5: original.headline5,
      description1: original.description1,
      description2: original.description2,
      description3: original.description3,
      description4: original.description4,
      description5: original.description5,
      callToAction: original.callToAction,
      beneficiaryName: original.beneficiaryName,
      payerName: original.payerName,
    };

    setIsCreating(true);
    try {
      await createAdPreset(original.product.id, presetName, payload);
      await adPresetsQuery.refetch();
    } finally {
      setIsCreating(false);
    }
  }, [adPresetsQuery]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    adPresets,
    isLoading: adPresetsQuery.isLoading,
    isError: adPresetsQuery.isError,
    error: adPresetsQuery.error,
    refetch: adPresetsQuery.refetch,

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
    filteredAdPresets,

    // Status counts
    statusCounts,

    // Selection
    selectedPresetId,
    setSelectedPresetId,
    selectedPreset,

    // Mutations
    savePreset: handleSavePreset,
    createPreset: handleCreatePreset,
    duplicatePreset: handleDuplicatePreset,
    isSaving,
    isCreating,
  };
}
