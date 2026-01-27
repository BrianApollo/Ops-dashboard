/**
 * useDetailPanel - Shared hook for managing detail panel state.
 * Consolidates the pattern of tracking selected ID and deriving the detail record.
 */

import { useState, useMemo, useCallback } from 'react';

interface UseDetailPanelReturn<T> {
  /** Currently selected ID (null if no selection) */
  detailId: string | null;
  /** Set the selected ID */
  setDetailId: (id: string | null) => void;
  /** The selected record (derived from ID lookup) */
  detail: T | null;
  /** Open the detail panel for a specific ID */
  openDetail: (id: string) => void;
  /** Close the detail panel */
  closeDetail: () => void;
  /** Whether the panel is open */
  isOpen: boolean;
}

/**
 * Hook to manage detail panel state with ID-based selection.
 * Derives the detail record from the ID to avoid stale state issues.
 *
 * @param records - Array of records to search
 * @param getId - Optional function to extract ID from record (defaults to `r => r.id`)
 */
export function useDetailPanel<T extends { id: string }>(
  records: T[],
  getId: (record: T) => string = (r) => r.id
): UseDetailPanelReturn<T> {
  const [detailId, setDetailId] = useState<string | null>(null);

  // Derive detail from ID (avoids stale state)
  const detail = useMemo(() => {
    if (!detailId) return null;
    return records.find((r) => getId(r) === detailId) ?? null;
  }, [records, detailId, getId]);

  const openDetail = useCallback((id: string) => {
    setDetailId(id);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
  }, []);

  const isOpen = detailId !== null;

  return {
    detailId,
    setDetailId,
    detail,
    openDetail,
    closeDetail,
    isOpen,
  };
}
