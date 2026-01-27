/**
 * View State Types
 */

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ViewStateConfig<T, F> {
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

export interface ViewState<T, F> {
  filteredRecords: T[];
  visibleRecords: T[];
  totalCount: number;
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
}
