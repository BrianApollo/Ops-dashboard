import { useQuery } from '@tanstack/react-query';
import { useViewState } from '../view-state/useViewState';
import { useCallback, useMemo } from 'react';

type BaseRecord = { id: string };

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// Split config into two modes
interface QueryModeConfig<T extends BaseRecord> {
  queryKey: string[];
  queryFn: () => T[] | Promise<T[]>;
  records?: never;
}

interface DirectModeConfig<T extends BaseRecord> {
  records: T[];
  queryKey?: never;
  queryFn?: never;
}

interface BaseConfig<T extends BaseRecord, F = Record<string, unknown>> {
  initialFilters?: F;
  initialSort?: SortConfig | null;
  initialPageSize?: number;
  initialViewMode?: string;
  clearSelectionOnFilterChange?: boolean;
  clearSelectionOnSearchChange?: boolean;
  filterFn?: (records: T[], filters: F) => T[];
  searchFn?: (records: T[], searchTerm: string) => T[];
  compareFn?: (a: T, b: T, sort: SortConfig) => number;
}

type UseListControllerConfig<T extends BaseRecord, F = Record<string, unknown>> =
  BaseConfig<T, F> & (QueryModeConfig<T> | DirectModeConfig<T>);

export interface UseListControllerResult<T extends BaseRecord, F = Record<string, unknown>> {
  allRecords: T[];
  filteredRecords: T[];
  visibleRecords: T[];
  filteredCount: number;
  totalCount: number;
  totalPages: number;
  filters: F;
  searchTerm: string;
  sort: SortConfig | null;
  pageIndex: number;
  pageSize: number;
  selection: Set<string>;
  viewMode: string;
  setFilters: (filters: F) => void;
  setSearchTerm: (term: string) => void;
  setSort: (sort: SortConfig | null) => void;
  setPageIndex: (index: number) => void;
  setPageSize: (size: number) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setViewMode: (mode: string) => void;
  handleSort: (field: string) => void;
  getSelectedIds: () => string[];
  isSelected: (id: string) => boolean;
  hasSelection: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useListController<T extends BaseRecord, F = Record<string, unknown>>(
  config: UseListControllerConfig<T, F>
): UseListControllerResult<T, F> {
  const {
    initialFilters,
    initialSort,
    initialPageSize,
    initialViewMode,
    clearSelectionOnFilterChange,
    clearSelectionOnSearchChange,
    filterFn,
    searchFn,
    compareFn,
  } = config;

  // Determine mode: query or direct
  const isQueryMode = 'queryFn' in config && config.queryFn !== undefined;

  // Query mode: fetch via TanStack Query
  const {
    data: queryData = [],
    refetch: queryRefetch,
    isLoading: queryLoading,
  } = useQuery({
    queryKey: isQueryMode ? config.queryKey : ['__disabled__'],
    queryFn: isQueryMode ? config.queryFn : () => [],
    enabled: isQueryMode,
  });

  // Direct mode: use records prop directly
  const records = isQueryMode ? queryData : (config as DirectModeConfig<T>).records;

  const refetch = useCallback(async () => {
    if (isQueryMode) {
      await queryRefetch();
    }
    // Direct mode: no-op (parent controls data)
  }, [isQueryMode, queryRefetch]);

  const viewState = useViewState<T, F>(records, {
    initialFilters,
    initialSort,
    initialPageSize,
    initialViewMode,
    clearSelectionOnFilterChange,
    clearSelectionOnSearchChange,
    filterFn,
    searchFn,
    compareFn,
  });

  const {
    filteredRecords,
    visibleRecords,
    totalCount,
    filters,
    searchTerm,
    sort,
    pageIndex,
    pageSize,
    selection,
    viewMode,
    setFilters,
    setSearchTerm,
    setSort,
    setPageIndex,
    setPageSize,
    toggleSelection,
    selectAll,
    clearSelection,
    setViewMode,
  } = viewState;

  const totalPages = useMemo(
    () => Math.ceil(totalCount / pageSize),
    [totalCount, pageSize]
  );

  const handleSort = useCallback(
    (field: string) => {
      if (sort?.field === field) {
        setSort({ field, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
      } else {
        setSort({ field, direction: 'asc' });
      }
    },
    [sort, setSort]
  );

  const getSelectedIds = useCallback(
    () => Array.from(selection),
    [selection]
  );

  const isSelected = useCallback(
    (id: string) => selection.has(id),
    [selection]
  );

  const hasSelection = selection.size > 0;

  return {
    allRecords: records,
    filteredRecords,
    visibleRecords,
    filteredCount: totalCount,
    totalCount: records.length,
    totalPages,
    filters,
    searchTerm,
    sort,
    pageIndex,
    pageSize,
    selection,
    viewMode,
    setFilters,
    setSearchTerm,
    setSort,
    setPageIndex,
    setPageSize,
    toggleSelection,
    selectAll,
    clearSelection,
    setViewMode,
    handleSort,
    getSelectedIds,
    isSelected,
    hasSelection,
    isLoading: isQueryMode ? queryLoading : false,
    refetch,
  };
}
