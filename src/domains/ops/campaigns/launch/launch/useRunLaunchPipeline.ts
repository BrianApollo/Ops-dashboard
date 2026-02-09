/**
 * useRunLaunchPipeline
 *
 * ENGINE: Launch-only execution orchestration hook.
 *
 * Role in lifecycle architecture:
 * - Called by useLaunchExecution (BRIDGE)
 * - Executes Facebook launch via useFbLaunchRunner
 * - Validates input, maps to FB format, tracks progress
 * - Returns result to bridge for post-launch handling
 *
 * Does NOT handle:
 * - Airtable persistence (that's postlaunch/)
 * - LaunchSnapshot building (that's postlaunch/)
 * - Any post-launch logic
 *
 * This is pure launch-phase execution.
 */

import { useState, useMemo, useCallback } from 'react';
import { useFbLaunchRunner, mapToFbLaunchInput } from '../../../../../features/campaigns/launch';
import type { FbLaunchState } from '../../../../../features/campaigns/launch';

// =============================================================================
// TYPES
// =============================================================================

export interface VideoForLaunch {
  id: string;
  name: string;
  creativeLink?: string;
  fbVideoId?: string;
}

export interface ImageForLaunch {
  id: string;
  name: string;
  thumbnailUrl?: string;
  image_drive_link?: string;
}

export interface DraftForLaunch {
  name?: string;
  adAccountId?: string | null;
  pageId?: string | null;
  pixelId?: string | null;
  budget?: string;
  geo?: string;
  startDate?: string;
  startTime?: string;
  websiteUrl?: string;
  utms?: string;
  ctaOverride?: string;
  adPresetId?: string | null;
  primaryTexts?: string[];
  headlines?: string[];
  descriptions?: string[];
}

export interface ProfileForLaunch {
  id: string;
  permanentToken: string | null;
  profileName: string;
}

export interface PresetForLaunch {
  id: string;
  name: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction: string;
}

export interface MediaCounts {
  videos: { total: number; uploaded: number; ready: number };
  images: { total: number; uploaded: number; ready: number };
}

export interface LaunchPipelineInput {
  campaignId: string;
  draft: DraftForLaunch;
  selectedProfile: ProfileForLaunch | undefined;
  selectedVideos: VideoForLaunch[];
  selectedImages: ImageForLaunch[];
  selectedPreset: PresetForLaunch | null;
  reuseCreatives: boolean;
  launchStatusActive: boolean;
  redtrackTrackingParams: string | null;
}

export interface LaunchPipelineResult {
  /** FB launch state result */
  result: FbLaunchState;
  /** Videos that had valid URLs and were included in launch */
  videosWithUrls: VideoForLaunch[];
  /** Images that had valid URLs and were included in launch */
  imagesWithUrls: ImageForLaunch[];
}

export interface UseRunLaunchPipelineReturn {
  /** Execute the launch pipeline */
  runLaunch: (input: LaunchPipelineInput) => Promise<LaunchPipelineResult>;
  /** Retry a single media item by name */
  retryItem: (name: string) => void;
  /** Whether launch is currently running */
  isLaunching: boolean;
  /** Current progress state from FB runner */
  launchProgress: FbLaunchState | null;
  /** Media upload/creation counts */
  mediaCounts: MediaCounts;
  /** Validation error (if any) */
  validationError: string | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useRunLaunchPipeline(): UseRunLaunchPipelineReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [isLaunching, setIsLaunching] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // FACEBOOK LAUNCH RUNNER
  // ---------------------------------------------------------------------------
  const fbLaunch = useFbLaunchRunner();

  // ---------------------------------------------------------------------------
  // MEDIA COUNTS (derived from fbLaunch state)
  // ---------------------------------------------------------------------------
  const mediaCounts = useMemo((): MediaCounts => {
    const media = fbLaunch.state?.media || [];

    const videos = media.filter((m) => m.type === 'video');
    const images = media.filter((m) => m.type === 'image');

    const uploadedStates = ['processing', 'ready', 'creating_ad', 'done'];

    return {
      videos: {
        total: videos.length,
        uploaded: videos.filter((m) => uploadedStates.includes(m.state)).length,
        ready: videos.filter((m) => m.state === 'done').length,
      },
      images: {
        total: images.length,
        uploaded: images.filter((m) => uploadedStates.includes(m.state)).length,
        ready: images.filter((m) => m.state === 'done').length,
      },
    };
  }, [fbLaunch.state]);

  // ---------------------------------------------------------------------------
  // RUN LAUNCH
  // ---------------------------------------------------------------------------
  const runLaunch = useCallback(async (input: LaunchPipelineInput): Promise<LaunchPipelineResult> => {
    const {
      campaignId,
      draft,
      selectedProfile,
      selectedVideos,
      selectedImages,
      selectedPreset,
      reuseCreatives,
      launchStatusActive,
      redtrackTrackingParams,
    } = input;

    setValidationError(null);

    // -------------------------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------------------------
    if (!selectedProfile || !selectedProfile.permanentToken) {
      const error = 'Please select a profile with valid access token';
      setValidationError(error);
      throw new Error(error);
    }
    if (!campaignId) {
      const error = 'Campaign ID is missing';
      setValidationError(error);
      throw new Error(error);
    }
    if (!draft.adAccountId) {
      const error = 'Please select an ad account';
      setValidationError(error);
      throw new Error(error);
    }
    if (!draft.pageId) {
      const error = 'Please select a Facebook page';
      setValidationError(error);
      throw new Error(error);
    }
    if (!draft.pixelId) {
      const error = 'Please select a pixel';
      setValidationError(error);
      throw new Error(error);
    }

    if (selectedVideos.length === 0 && selectedImages.length === 0) {
      const error = 'No media (videos or images) selected';
      setValidationError(error);
      throw new Error(error);
    }

    // Filter to only media with valid URLs
    const videosWithUrls = selectedVideos.filter(v => v.creativeLink);
    const imagesWithUrls = selectedImages.filter(i => i.image_drive_link || i.thumbnailUrl);

    if (videosWithUrls.length === 0 && imagesWithUrls.length === 0) {
      const error = 'No valid media found (selected media missing URLs)';
      setValidationError(error);
      throw new Error(error);
    }

    // -------------------------------------------------------------------------
    // LAUNCH EXECUTION
    // -------------------------------------------------------------------------
    setIsLaunching(true);

    try {
      // Map input using the mapper
      const fbInput = mapToFbLaunchInput({
        draft: {
          name: draft.name || `Campaign ${campaignId}`,
          adAccountId: draft.adAccountId!,
          pageId: draft.pageId!,
          pixelId: draft.pixelId!,
          budget: draft.budget || '',
          geo: draft.geo || '',
          startDate: draft.startDate || '',
          startTime: draft.startTime || '',
          websiteUrl: draft.websiteUrl || '',
          utms: draft.utms || redtrackTrackingParams || '',
          ctaOverride: draft.ctaOverride || '',
          primaryTexts: draft.primaryTexts || [],
          headlines: draft.headlines || [],
          descriptions: draft.descriptions || [],
        },
        selectedVideos: videosWithUrls.map(v => ({
          id: v.id,
          name: v.name,
          creativeLink: v.creativeLink,
          // Only pass fbVideoId if reuseCreatives is ON - otherwise force re-upload
          fbVideoId: reuseCreatives ? (v.fbVideoId || null) : null,
        })),
        selectedImages: imagesWithUrls.map(i => ({
          id: i.id,
          name: i.name,
          thumbnailUrl: i.thumbnailUrl,
          image_drive_link: i.image_drive_link,
        })),
        profile: {
          id: selectedProfile.id,
          permanentToken: selectedProfile.permanentToken,
          profileName: selectedProfile.profileName,
        },
        selectedPreset: selectedPreset ? {
          id: selectedPreset.id,
          name: selectedPreset.name,
          primaryTexts: selectedPreset.primaryTexts,
          headlines: selectedPreset.headlines,
          descriptions: selectedPreset.descriptions,
          callToAction: selectedPreset.callToAction,
        } : null,
        reuseCreatives,
        launchStatusActive,
      });

      console.log('[useRunLaunchPipeline] Launching campaign:', {
        videos: videosWithUrls.length,
        images: imagesWithUrls.length,
        campaignName: fbInput.campaign.name,
      });

      // Execute launch
      const result = await fbLaunch.launch(fbInput);

      console.log('[useRunLaunchPipeline] Launch result:', result.phase);

      return {
        result,
        videosWithUrls,
        imagesWithUrls,
      };
    } finally {
      setIsLaunching(false);
    }
  }, [fbLaunch]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    runLaunch,
    retryItem: fbLaunch.retryItem,
    isLaunching: isLaunching || (fbLaunch.state?.isRunning ?? false),
    launchProgress: fbLaunch.state,
    mediaCounts,
    validationError,
  };
}
