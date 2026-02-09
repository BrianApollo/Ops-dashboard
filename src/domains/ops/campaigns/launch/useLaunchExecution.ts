/**
 * useLaunchExecution
 *
 * BRIDGE: Lifecycle bridge between LAUNCH and POST-LAUNCH phases.
 *
 * Role in lifecycle architecture:
 * - Called by useCampaignLaunchController (FACADE)
 * - Orchestrates useRunLaunchPipeline (ENGINE - launch phase)
 * - Calls writeLaunchSnapshot after success (postlaunch phase)
 * - Manages launchResult state for UI consumption
 *
 * This is the ONLY file that spans launch → postlaunch.
 * All other launch code lives under launch/.
 * All other post-launch code lives under postlaunch/.
 */

import { useState, useCallback, useEffect } from 'react';
import type { FbLaunchState } from '../../../../features/campaigns/launch';
import type { SelectableVideo, SelectableImage, CampaignDraft } from './types';
import { useRunLaunchPipeline } from './launch/useRunLaunchPipeline';
import type { MediaCounts } from './launch/useRunLaunchPipeline';
import { writeLaunchSnapshot } from './postlaunch/writeLaunchSnapshot';

// =============================================================================
// TYPES
// =============================================================================

interface AdPresetForLaunch {
  id: string;
  name: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction: string;
  beneficiaryName: string;
  payerName: string;
}

interface ProfileForLaunch {
  id: string;
  permanentToken: string | null;
  profileName: string;
}

export interface LaunchResult {
  campaignId?: string;
  adSetId?: string;
  success: boolean;
  error?: string;
  // Tracks post-launch Airtable persistence failures
  airtableFailed?: boolean;
  airtableError?: string;
}

export { MediaCounts };

export interface UseLaunchExecutionOptions {
  campaignId: string;
  draft: CampaignDraft; // Use shared CampaignDraft type which allows nulls
  selectedProfile: ProfileForLaunch | undefined;
  availableVideos: SelectableVideo[];
  availableImages: SelectableImage[];
  selectedVideoIds: Set<string>;
  selectedImageIds: Set<string>;
  productPresets: AdPresetForLaunch[];
  reuseCreatives: boolean;
  launchStatusActive: boolean;
  redtrackTrackingParams: string | null;
}

export interface UseLaunchExecutionReturn {
  isLaunching: boolean;
  launchResult: LaunchResult | null;
  mediaCounts: MediaCounts;
  launchProgress: FbLaunchState | null;
  launch: () => Promise<void>;
  retryItem: (name: string) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useLaunchExecution({
  campaignId,
  draft,
  selectedProfile,
  availableVideos,
  availableImages,
  selectedVideoIds,
  selectedImageIds,
  productPresets,
  reuseCreatives,
  launchStatusActive,
  redtrackTrackingParams,
}: UseLaunchExecutionOptions): UseLaunchExecutionReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);

  // ---------------------------------------------------------------------------
  // LAUNCH PIPELINE (launch phase)
  // ---------------------------------------------------------------------------
  const pipeline = useRunLaunchPipeline();

  // ---------------------------------------------------------------------------
  // SYNC PROGRESS FROM FB LAUNCH TO LAUNCH RESULT
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (pipeline.launchProgress) {
      setLaunchResult((prev) => ({
        ...prev,
        success: pipeline.launchProgress?.phase === 'complete',
        campaignId: pipeline.launchProgress?.campaignId || prev?.campaignId,
        adSetId: pipeline.launchProgress?.adsetId || prev?.adSetId,
        error: pipeline.launchProgress?.error || prev?.error,
      }));
    }
  }, [pipeline.launchProgress]);

  // ---------------------------------------------------------------------------
  // LAUNCH FUNCTION (lifecycle bridge)
  // ---------------------------------------------------------------------------
  const launch = useCallback(async () => {
    // Get selected media
    const selectedVideos = availableVideos.filter((v) => selectedVideoIds.has(v.id));
    const selectedImages = availableImages.filter((i) => selectedImageIds.has(i.id));

    // Get selected preset
    const selectedPreset = productPresets.find((p) => p.id === draft.adPresetId) || null;

    // Initialize result for real-time updates
    setLaunchResult({ success: false });

    try {
      // =======================================================================
      // LAUNCH PHASE: Execute FB launch pipeline
      // =======================================================================
      const { result, videosWithUrls, imagesWithUrls } = await pipeline.runLaunch({
        campaignId,
        draft,
        selectedProfile,
        selectedVideos,
        selectedImages,
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
        redtrackTrackingParams,
      });

      // Final update with success status
      setLaunchResult({
        campaignId: result.campaignId || undefined,
        adSetId: result.adsetId || undefined,
        success: result.phase === 'complete',
        error: result.error,
      });

      // =======================================================================
      // POST-LAUNCH PHASE: Persist to Airtable
      // =======================================================================
      if (result.phase === 'complete') {
        console.log('Campaign launched successfully!');

        const snapshotResult = await writeLaunchSnapshot({
          result,
          campaignId,
          draft: {
            name: draft.name,
            adAccountId: draft.adAccountId!,
            pageId: draft.pageId!,
            pixelId: draft.pixelId!,
            budget: draft.budget,
            geo: draft.geo,
            startDate: draft.startDate,
            startTime: draft.startTime,
            websiteUrl: draft.websiteUrl,
            utms: draft.utms,
            ctaOverride: draft.ctaOverride,
            redtrackCampaignId: draft.redtrackCampaignId,
            redtrackCampaignName: draft.redtrackCampaignName,
          },
          profile: {
            id: selectedProfile!.id,
            profileName: selectedProfile!.profileName,
          },
          preset: selectedPreset ? {
            id: selectedPreset.id,
            name: selectedPreset.name,
            primaryTexts: draft.primaryTexts,
            headlines: draft.headlines,
            descriptions: draft.descriptions,
            callToAction: selectedPreset.callToAction,
          } : undefined,
          videosWithUrls: videosWithUrls.map(v => ({
            id: v.id,
            name: v.name,
            creativeLink: v.creativeLink,
          })),
          imagesWithUrls: imagesWithUrls.map(i => ({
            id: i.id,
            name: i.name,
          })),
          launchStatusActive,
        });

        if (!snapshotResult.success) {
          // Don't fail the launch for post-launch errors, but track partial failure
          setLaunchResult(prev => ({
            ...prev,
            success: prev?.success ?? true,
            airtableFailed: true,
            airtableError: snapshotResult.error || 'Failed to save launch data',
          }));
        }
      } else if (result.phase === 'error') {
        console.error('Launch failed:', result.error);
      } else if (result.phase === 'stopped') {
        console.log('Launch was stopped by user');
      }
    } catch (err) {
      console.error('Launch error:', err);
      setLaunchResult({
        success: false,
        error: (err as Error).message,
      });
    }
  }, [campaignId, draft, selectedProfile, availableVideos, availableImages, selectedVideoIds, selectedImageIds, productPresets, reuseCreatives, launchStatusActive, redtrackTrackingParams, pipeline]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    isLaunching: pipeline.isLaunching,
    launchResult,
    mediaCounts: pipeline.mediaCounts,
    launchProgress: pipeline.launchProgress,
    launch,
    retryItem: pipeline.retryItem,
  };
}
