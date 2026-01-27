import { useState, useEffect, useCallback, useRef } from 'react';

interface DraftMetadata {
  savedAt: string;
  values: unknown;
}

interface UseDraftStateOptions<T> {
  key: string;
  values: T;
  enabled?: boolean;
  debounceMs?: number;
}

interface UseDraftStateResult<T> {
  hasDraft: boolean;
  draftSavedAt: Date | null;
  restoreDraft: () => T | null;
  clearDraft: () => void;
  saveDraft: () => void;
}

const DRAFT_PREFIX = 'form-draft:';

function getDraftKey(key: string): string {
  return `${DRAFT_PREFIX}${key}`;
}

function loadDraft(key: string): DraftMetadata | null {
  try {
    const stored = localStorage.getItem(getDraftKey(key));
    if (!stored) return null;
    return JSON.parse(stored) as DraftMetadata;
  } catch {
    return null;
  }
}

function saveDraftToStorage<T>(key: string, values: T): void {
  try {
    const metadata: DraftMetadata = {
      savedAt: new Date().toISOString(),
      values,
    };
    localStorage.setItem(getDraftKey(key), JSON.stringify(metadata));
  } catch {
    // Storage full or unavailable, silently fail
  }
}

function clearDraftFromStorage(key: string): void {
  try {
    localStorage.removeItem(getDraftKey(key));
  } catch {
    // Silently fail
  }
}

export function useDraftState<T>({
  key,
  values,
  enabled = true,
  debounceMs = 1000,
}: UseDraftStateOptions<T>): UseDraftStateResult<T> {
  const [draftMeta, setDraftMeta] = useState<DraftMetadata | null>(() =>
    enabled ? loadDraft(key) : null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef(values);

  // Keep values ref updated
  valuesRef.current = values;

  // Auto-save with debounce when values change
  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout for debounced save
    debounceRef.current = setTimeout(() => {
      saveDraftToStorage(key, valuesRef.current);
      setDraftMeta({
        savedAt: new Date().toISOString(),
        values: valuesRef.current,
      });
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [key, values, enabled, debounceMs]);

  const restoreDraft = useCallback((): T | null => {
    const draftData = loadDraft(key);
    if (draftData) {
      return draftData.values as T;
    }
    return null;
  }, [key]);

  const clearDraft = useCallback(() => {
    clearDraftFromStorage(key);
    setDraftMeta(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, [key]);

  const saveDraft = useCallback(() => {
    saveDraftToStorage(key, valuesRef.current);
    setDraftMeta({
      savedAt: new Date().toISOString(),
      values: valuesRef.current,
    });
  }, [key]);

  return {
    hasDraft: draftMeta !== null,
    draftSavedAt: draftMeta ? new Date(draftMeta.savedAt) : null,
    restoreDraft,
    clearDraft,
    saveDraft,
  };
}

/**
 * Check if a draft exists for a given key without loading the hook
 */
export function hasDraftForKey(key: string): boolean {
  return loadDraft(key) !== null;
}

/**
 * Get draft metadata for a given key
 */
export function getDraftMetadata(key: string): { savedAt: Date; values: unknown } | null {
  const draft = loadDraft(key);
  if (draft) {
    return {
      savedAt: new Date(draft.savedAt),
      values: draft.values,
    };
  }
  return null;
}
