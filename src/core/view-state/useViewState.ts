/**
 * useViewState
 *
 * Generic state management hook for list views.
 * Provides filtering, searching, sorting, pagination, and selection.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { SortConfig, ViewStateConfig, ViewState } from './types';

type BaseRecord = { id: string };

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_VIEW_MODE = 'table';

export function useViewState<T extends BaseRecord, F = Record<string, unknown>>(
  records: T[],
  config: ViewStateConfig<T, F> = {}
): ViewState<T, F> {
  const {
    initialFilters = {} as F,
    initialSort = null,
    initialPageSize = DEFAULT_PAGE_SIZE,
    initialViewMode = DEFAULT_VIEW_MODE,
    clearSelectionOnFilterChange = true,
    clearSelectionOnSearchChange = true,
    filterFn,
    searchFn,
    compareFn,
  } = config;

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [filters, setFiltersState] = useState<F>(initialFilters);
  const [searchTerm, setSearchTermState] = useState('');
  const [sort, setSort] = useState<SortConfig | null>(initialSort);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState(initialViewMode);

  // ---------------------------------------------------------------------------
  // FILTERED RECORDS
  // ---------------------------------------------------------------------------

  const filteredRecords = useMemo(() => {
    let result = [...records];

    // Apply custom filter function
    if (filterFn) {
      result = filterFn(result, filters);
    }

    // Apply search
    if (searchTerm && searchFn) {
      result = searchFn(result, searchTerm);
    }

    // Apply sort
    if (sort && compareFn) {
      result = [...result].sort((a, b) => compareFn(a, b, sort));
    } else if (sort) {
      // Default sort by field
      result = [...result].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sort.field];
        const bVal = (b as Record<string, unknown>)[sort.field];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const comparison = aVal < bVal ? -1 : 1;
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [records, filters, searchTerm, sort, filterFn, searchFn, compareFn]);

  // ---------------------------------------------------------------------------
  // VISIBLE RECORDS (paginated)
  // ---------------------------------------------------------------------------

  const visibleRecords = useMemo(() => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return filteredRecords.slice(start, end);
  }, [filteredRecords, pageIndex, pageSize]);

  // ---------------------------------------------------------------------------
  // TOTAL COUNT
  // ---------------------------------------------------------------------------

  const totalCount = filteredRecords.length;

  // ---------------------------------------------------------------------------
  // RESET PAGE ON FILTER/SEARCH CHANGE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setPageIndex(0);
  }, [filters, searchTerm]);

  // ---------------------------------------------------------------------------
  // SETTERS WITH SELECTION CLEARING
  // ---------------------------------------------------------------------------

  const setFilters = useCallback(
    (newFilters: F) => {
      setFiltersState(newFilters);
      if (clearSelectionOnFilterChange) {
        setSelection(new Set());
      }
    },
    [clearSelectionOnFilterChange]
  );

  const setSearchTerm = useCallback(
    (term: string) => {
      setSearchTermState(term);
      if (clearSelectionOnSearchChange) {
        setSelection(new Set());
      }
    },
    [clearSelectionOnSearchChange]
  );

  // ---------------------------------------------------------------------------
  // SELECTION HANDLERS
  // ---------------------------------------------------------------------------

  const toggleSelection = useCallback((id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = filteredRecords.map((r) => r.id);
    setSelection(new Set(allIds));
  }, [filteredRecords]);

  const clearSelection = useCallback(() => {
    setSelection(new Set());
  }, []);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
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
  };
}
