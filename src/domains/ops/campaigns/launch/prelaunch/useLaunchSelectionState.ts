/**
 * useLaunchSelectionState
 *
 * Manages selection state for campaign launch:
 * - Video/image selection
 * - Profile selection
 * - Toggle states (reuseCreatives, launchStatusActive)
 * - Random selection helpers
 * - Derived counts
 *
 * Extracted from useCampaignLaunchController (Phase 7.2 Step 1).
 */

import { useState, useCallback, useMemo } from 'react';
import type { SelectableVideo, SelectableImage } from '../types';

export interface UseLaunchSelectionStateReturn {
  // State
  selectedVideoIds: Set<string>;
  selectedImageIds: Set<string>;
  reuseCreatives: boolean;
  launchStatusActive: boolean;

  // Setters (for initialization from campaign data)
  setSelectedVideoIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedImageIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setReuseCreatives: React.Dispatch<React.SetStateAction<boolean>>;
  setLaunchStatusActive: React.Dispatch<React.SetStateAction<boolean>>;

  // Handlers
  toggleVideo: (id: string) => void;
  toggleImage: (id: string) => void;
  selectRandomVideos: (count: number) => void;
  selectRandomImages: (count: number) => void;
  unselectAllVideos: () => void;
  unselectAllImages: () => void;
  toggleReuseCreatives: () => void;
  toggleLaunchStatusActive: () => void;

  // Derived counts
  videosNotInLibraryCount: number;
  selectedNotInLibraryCount: number;
}

export function useLaunchSelectionState(
  availableVideos: SelectableVideo[],
  availableImages: SelectableImage[]
): UseLaunchSelectionStateReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [reuseCreatives, setReuseCreatives] = useState(true);
  const [launchStatusActive, setLaunchStatusActive] = useState(true);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const toggleVideo = useCallback((id: string) => {
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleImage = useCallback((id: string) => {
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectRandomVideos = useCallback((count: number) => {
    const shuffled = [...availableVideos].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count).map((v) => v.id);
    setSelectedVideoIds(new Set(selected));
  }, [availableVideos]);

  const selectRandomImages = useCallback((count: number) => {
    const shuffled = [...availableImages].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count).map((i) => i.id);
    setSelectedImageIds(new Set(selected));
  }, [availableImages]);

  const unselectAllVideos = useCallback(() => {
    setSelectedVideoIds(new Set());
  }, []);

  const unselectAllImages = useCallback(() => {
    setSelectedImageIds(new Set());
  }, []);

  const toggleReuseCreatives = useCallback(() => {
    setReuseCreatives((prev) => !prev);
  }, []);

  const toggleLaunchStatusActive = useCallback(() => {
    setLaunchStatusActive((prev) => !prev);
  }, []);

  // ---------------------------------------------------------------------------
  // DERIVED COUNTS
  // ---------------------------------------------------------------------------
  const videosNotInLibraryCount = useMemo(
    () => availableVideos.filter((v) => !v.inLibrary).length,
    [availableVideos]
  );

  const selectedNotInLibraryCount = useMemo(
    () => availableVideos.filter((v) => selectedVideoIds.has(v.id) && !v.inLibrary).length,
    [availableVideos, selectedVideoIds]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    // State
    selectedVideoIds,
    selectedImageIds,
    reuseCreatives,
    launchStatusActive,

    // Setters
    setSelectedVideoIds,
    setSelectedImageIds,
    setReuseCreatives,
    setLaunchStatusActive,

    // Handlers
    toggleVideo,
    toggleImage,
    selectRandomVideos,
    selectRandomImages,
    unselectAllVideos,
    unselectAllImages,
    toggleReuseCreatives,
    toggleLaunchStatusActive,

    // Derived counts
    videosNotInLibraryCount,
    selectedNotInLibraryCount,
  };
}
