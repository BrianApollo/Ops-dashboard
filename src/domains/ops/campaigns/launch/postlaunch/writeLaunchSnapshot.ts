/**
 * writeLaunchSnapshot
 *
 * Post-launch persistence logic extracted from useLaunchExecution.
 * Handles:
 * - Updating video records in Airtable (mark as "Used")
 * - Building and saving the launch snapshot to Airtable
 *
 * This is a pure function - no React hooks, no React imports.
 */

import { updateLaunchData } from '../../../../../features/campaigns/data';
import { updateVideosBatch, FIELD_USED_IN_CAMPAIGN } from '../../../../../features/videos/data';
import type { FbLaunchState, LaunchSnapshot, LaunchSnapshotMedia, LaunchSnapshotFailedMedia } from '../../../../../features/campaigns/launch';

// =============================================================================
// TYPES
// =============================================================================

export interface VideoForSnapshot {
  id: string;
  name: string;
  creativeLink?: string;
}

export interface ImageForSnapshot {
  id: string;
  name: string;
}

export interface DraftForSnapshot {
  name?: string;
  adAccountId: string;
  pageId: string;
  pixelId: string;
  budget?: string;
  geo?: string;
  startDate?: string;
  startTime?: string;
  websiteUrl?: string;
  utms?: string;
  ctaOverride?: string;
  redtrackCampaignId?: string;
  redtrackCampaignName?: string;
}

export interface ProfileForSnapshot {
  id: string;
  profileName: string;
}

export interface PresetForSnapshot {
  id: string;
  name: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction: string;
}

export interface WriteLaunchSnapshotInput {
  /** FB launch result */
  result: FbLaunchState;
  /** Airtable campaign record ID */
  campaignId: string;
  /** Draft configuration used for launch */
  draft: DraftForSnapshot;
  /** Profile used for launch */
  profile: ProfileForSnapshot;
  /** Ad preset used (optional) */
  preset?: PresetForSnapshot;
  /** Videos with URLs that were launched */
  videosWithUrls: VideoForSnapshot[];
  /** Images with URLs that were launched */
  imagesWithUrls: ImageForSnapshot[];
  /** Whether campaign was launched as ACTIVE */
  launchStatusActive: boolean;
}

export interface WriteLaunchSnapshotResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export async function writeLaunchSnapshot({
  result,
  campaignId,
  draft,
  profile,
  preset,
  videosWithUrls,
  imagesWithUrls,
  launchStatusActive,
}: WriteLaunchSnapshotInput): Promise<WriteLaunchSnapshotResult> {
  try {
    // -------------------------------------------------------------------------
    // 1. Update Video Records in Airtable (mark as "Used")
    // -------------------------------------------------------------------------
    const succeededVideos = result.media
      .filter(m => m.type === 'video' && m.state === 'done' && m.adId);

    if (succeededVideos.length > 0) {
      // Map video names back to their Airtable IDs
      const videoIdMap = new Map(videosWithUrls.map(v => [v.name, v.id]));
      const videoUpdates = succeededVideos
        .map(v => videoIdMap.get(v.name))
        .filter((id): id is string => !!id)
        .map(id => ({
          id,
          fields: {
            [FIELD_USED_IN_CAMPAIGN]: [campaignId],
            'Status': 'Used',
          }
        }));

      if (videoUpdates.length > 0) {
        console.log('[writeLaunchSnapshot] Updating Airtable video records...', { count: videoUpdates.length });
        await updateVideosBatch(videoUpdates);
        console.log('[writeLaunchSnapshot] Airtable video update successful');
      }
    }

    // -------------------------------------------------------------------------
    // 2. Build and save launch snapshot
    // -------------------------------------------------------------------------
    if (!result.campaignId) {
      // No FB campaign created, nothing to snapshot
      return { success: true };
    }

    const succeededMedia = result.media.filter(m => m.state === 'done' && m.adId);
    const failedMedia = result.media.filter(m => m.state === 'failed');

    // Build media snapshot arrays
    const succeededVideosSnapshot: LaunchSnapshotMedia[] = succeededMedia
      .filter(m => m.type === 'video')
      .map(m => ({
        localId: videosWithUrls.find(v => v.name === m.name)?.id || m.name,
        name: m.name,
        fbMediaId: m.fbVideoId || undefined,
        thumbnailUrl: m.thumbnailUrl || undefined,
        adId: m.adId || undefined,
      }));

    const succeededImagesSnapshot: LaunchSnapshotMedia[] = succeededMedia
      .filter(m => m.type === 'image')
      .map(m => ({
        localId: imagesWithUrls.find(i => i.name === m.name)?.id || m.name,
        name: m.name,
        imageUrl: m.url,
        adId: m.adId || undefined,
      }));

    const failedVideosSnapshot: LaunchSnapshotFailedMedia[] = failedMedia
      .filter(m => m.type === 'video')
      .map(m => ({
        localId: videosWithUrls.find(v => v.name === m.name)?.id || m.name,
        name: m.name,
        error: m.error || 'Unknown error',
        failedAt: m.fbVideoId ? 'ad-creation' as const : 'upload' as const,
      }));

    const failedImagesSnapshot: LaunchSnapshotFailedMedia[] = failedMedia
      .filter(m => m.type === 'image')
      .map(m => ({
        localId: imagesWithUrls.find(i => i.name === m.name)?.id || m.name,
        name: m.name,
        error: m.error || 'Unknown error',
        failedAt: 'ad-creation' as const,
      }));

    // Get ad IDs from succeeded media
    const adIds = succeededMedia.map(m => m.adId).filter((id): id is string => !!id);

    // Parse geo targets
    const geoTargets = draft.geo
      ? draft.geo.split(/[,\s]+/).map(g => g.trim().toUpperCase()).filter(Boolean)
      : ['US'];

    // Build the full snapshot
    const snapshot: LaunchSnapshot = {
      version: 1,
      launchedAt: new Date().toISOString(),

      config: {
        campaignName: draft.name || `Campaign ${campaignId}`,
        budget: parseFloat(draft.budget || '50'),
        budgetCents: Math.round(parseFloat(draft.budget || '50') * 100),
        geo: geoTargets,
        startDate: draft.startDate || undefined,
        startTime: draft.startTime || undefined,
        websiteUrl: draft.websiteUrl || 'https://example.com',
        utms: draft.utms || undefined,
        ctaOverride: draft.ctaOverride || undefined,
        launchStatus: launchStatusActive ? 'ACTIVE' : 'PAUSED',
      },

      facebook: {
        adAccountId: draft.adAccountId,
        pageId: draft.pageId,
        pixelId: draft.pixelId,
        campaignId: result.campaignId || undefined,
        adSetId: result.adsetId || undefined,
        adIds,
      },

      profile: {
        id: profile.id,
        name: profile.profileName,
      },

      adPreset: preset ? {
        id: preset.id,
        name: preset.name,
        primaryTexts: preset.primaryTexts,
        headlines: preset.headlines,
        descriptions: preset.descriptions,
        callToAction: preset.callToAction,
      } : undefined,

      redtrack: draft.redtrackCampaignId ? {
        campaignId: draft.redtrackCampaignId,
        campaignName: draft.redtrackCampaignName,
      } : undefined,

      media: {
        summary: {
          videosAttempted: videosWithUrls.length,
          videosSucceeded: succeededVideosSnapshot.length,
          videosFailed: failedVideosSnapshot.length,
          imagesAttempted: imagesWithUrls.length,
          imagesSucceeded: succeededImagesSnapshot.length,
          imagesFailed: failedImagesSnapshot.length,
        },
        videos: {
          succeeded: succeededVideosSnapshot,
          failed: failedVideosSnapshot,
        },
        images: {
          succeeded: succeededImagesSnapshot,
          failed: failedImagesSnapshot,
        },
      },

      result: {
        success: true,
        partialSuccess: failedMedia.length > 0,
        dryRun: false,
        adsAttempted: videosWithUrls.length + imagesWithUrls.length,
        adsCreated: adIds.length,
        adsFailed: failedMedia.length,
        completedAt: new Date().toISOString(),
        errors: failedMedia.map(m => ({
          mediaId: m.name,
          mediaName: m.name,
          stage: m.fbVideoId ? 'ad-creation' : 'upload',
          message: m.error || 'Unknown error',
        })),
      },
    };

    // Get image IDs from succeeded media to store in "Images Used In This Campaign"
    const succeededImageIds = result.media
      .filter(m => m.type === 'image' && m.state === 'done' && m.adId)
      .map(m => imagesWithUrls.find(i => i.name === m.name)?.id)
      .filter((id): id is string => !!id);

    // Save to Airtable
    await updateLaunchData({
      campaignId,
      fbCampaignId: result.campaignId,
      fbAdAccountId: draft.adAccountId,
      launchProfileId: profile.id,
      snapshot,
      imageIds: succeededImageIds,
    });
    console.log('[writeLaunchSnapshot] Saved launch snapshot to Airtable');

    return { success: true };
  } catch (err) {
    console.error('[writeLaunchSnapshot] Failed:', err);
    return {
      success: false,
      error: (err as Error).message || 'Failed to save launch data',
    };
  }
}
