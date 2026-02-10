/**
 * useAddAdsFlow
 *
 * Orchestration hook for the post-launch "Add Ads" modal.
 * Wires together:
 *  - Video + image controllers (product-filtered)
 *  - Prelaunch uploader (library check / upload / poll)
 *  - Template creative loading
 *  - Batch ad creation with retry
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVideosController, updateVideoUsage } from '../../../../features/videos';
import { useImagesController } from '../../../../features/images';
import { getFbCreative, addImageIdsToCampaign } from '../../../../features/campaigns';
import { usePrelaunchUploader } from '../launch/prelaunch/usePrelaunchUploader';
import { useLaunchMediaState } from '../launch/prelaunch/useLaunchMediaState';
import { mapTemplateCreative } from './mapTemplateCreative';
import { createAdsBatch } from '../../../../features/campaigns/launch/fbLaunchApi';
import type { FbCreative } from '../../../../features/campaigns';
import type { SelectableVideo, SelectableImage } from '../launch/types';
import type { MediaItemForAd, FbBatchResponseItem } from '../../../../features/campaigns/launch/fbLaunchApi';

// =============================================================================
// TYPES
// =============================================================================

export interface UseAddAdsFlowOptions {
  adSetId: string;
  templateCreativeId: string;
  campaignId: string;
  productId: string | undefined;
  adAccountId: string;
  accessToken: string;
}

export interface CreationProgress {
  current: number;
  total: number;
  message: string;
}

export interface CreationResult {
  success: number;
  failed: number;
  errors: string[];
  succeededMediaNames: string[];
}

export interface UseAddAdsFlowReturn {
  // Media lists
  availableVideos: SelectableVideo[];
  availableImages: SelectableImage[];

  // Selection
  selectedVideoIds: Set<string>;
  selectedImageIds: Set<string>;
  toggleVideo: (id: string) => void;
  toggleImage: (id: string) => void;

  // Video uploader
  uploader: ReturnType<typeof usePrelaunchUploader>;

  // Template
  templateCreative: FbCreative | null;
  isLoadingTemplate: boolean;
  templateError: string | null;

  // Readiness gate
  allMediaReady: boolean;
  readyCount: number;
  totalSelectedCount: number;

  // Status toggle
  adStatus: 'ACTIVE' | 'PAUSED';
  setAdStatus: (s: 'ACTIVE' | 'PAUSED') => void;
  reuseCreatives: boolean;
  setReuseCreatives: (v: boolean) => void;

  // Creation
  createAds: () => Promise<void>;
  isCreating: boolean;
  creationProgress: CreationProgress | null;
  creationResult: CreationResult | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// HOOK
// =============================================================================

export function useAddAdsFlow({
  adSetId,
  templateCreativeId,
  campaignId,
  productId,
  adAccountId,
  accessToken,
}: UseAddAdsFlowOptions): UseAddAdsFlowReturn {
  // ---------------------------------------------------------------------------
  // TEMPLATE CREATIVE
  // ---------------------------------------------------------------------------
  const [templateCreative, setTemplateCreative] = useState<FbCreative | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingTemplate(true);
    setTemplateError(null);

    getFbCreative(templateCreativeId, accessToken)
      .then((creative) => {
        if (!cancelled) setTemplateCreative(creative);
      })
      .catch((err) => {
        if (!cancelled)
          setTemplateError(err instanceof Error ? err.message : 'Failed to load template');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTemplate(false);
      });

    return () => {
      cancelled = true;
    };
  }, [templateCreativeId, accessToken]);

  // ---------------------------------------------------------------------------
  // MEDIA CONTROLLERS
  // ---------------------------------------------------------------------------
  const videosController = useVideosController();
  const imagesController = useImagesController();

  // ---------------------------------------------------------------------------
  // PRELAUNCH UPLOADER (uses base videos for library check / upload)
  // ---------------------------------------------------------------------------

  // Compute baseVideos independently (same logic as useLaunchMediaState)
  // so we can pass them to the uploader before calling useLaunchMediaState
  // for the merged display state.
  const baseVideos = useMemo(() => {
    if (!productId) return [];
    return videosController.list.allRecords
      .filter(
        (v) =>
          v.product.id === productId &&
          ['available', 'review'].includes(v.status) &&
          v.format !== 'YouTube',
      )
      .map((v) => ({ id: v.id, name: v.name, creativeLink: v.creativeLink }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videosController.list.allRecords, productId]);

  const uploader = usePrelaunchUploader({
    accessToken,
    adAccountId,
    videos: baseVideos,
  });

  // Re-derive media state with the real uploader
  const { availableVideos, availableImages } = useLaunchMediaState({
    productId,
    videosController,
    imagesController,
    prelaunchUploader: uploader,
  });

  // ---------------------------------------------------------------------------
  // SELECTION
  // ---------------------------------------------------------------------------
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

  const toggleVideo = useCallback((id: string) => {
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleImage = useCallback((id: string) => {
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // READINESS
  // ---------------------------------------------------------------------------
  const selectedVideos = availableVideos.filter((v) => selectedVideoIds.has(v.id));
  const selectedImages = availableImages.filter((i) => selectedImageIds.has(i.id));
  const totalSelectedCount = selectedVideos.length + selectedImages.length;

  const readyVideoCount = selectedVideos.filter(
    (v) => v.inLibrary || v.uploadStatus === 'ready',
  ).length;
  const readyCount = readyVideoCount + selectedImages.length; // images always ready
  const allMediaReady = totalSelectedCount > 0 && readyCount === totalSelectedCount;

  // ---------------------------------------------------------------------------
  // STATUS
  // ---------------------------------------------------------------------------
  const [adStatus, setAdStatus] = useState<'ACTIVE' | 'PAUSED'>('PAUSED');
  const [reuseCreatives, setReuseCreatives] = useState(true);

  // ---------------------------------------------------------------------------
  // CREATION
  // ---------------------------------------------------------------------------
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState<CreationProgress | null>(null);
  // Keep refs for async loop
  const uploadStatesRef = useRef(uploader.uploadStates);
  const libraryMapRef = useRef(uploader.libraryMap);
  useEffect(() => {
    uploadStatesRef.current = uploader.uploadStates;
    libraryMapRef.current = uploader.libraryMap;
  }, [uploader.uploadStates, uploader.libraryMap]);

  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);

  const createAds = useCallback(async () => {
    if (!templateCreative) return;

    setIsCreating(true);
    setCreationResult(null);

    try {
      let foundLibraryMap = new Map<string, { fbVideoId: string; thumbnailUrl: string }>();

      // 0. Check library if reuseCreatives is enabled
      if (reuseCreatives && selectedVideos.length > 0) {
        setCreationProgress({
          current: 0,
          total: totalSelectedCount,
          message: 'Checking library for existing videos...'
        });
        foundLibraryMap = await uploader.checkLibrary();
      }

      // 1. Check for missing videos & trigger uploads
      // Find videos that are selected but NOT in library and NOT ready/processing
      const videosToUpload = selectedVideos.filter(v => {
        // Check fresh library data AND stale ref data
        const inFreshLibrary = foundLibraryMap.has(v.name);
        const inStaleLibrary = libraryMapRef.current.has(v.name);
        const isInLibrary = inFreshLibrary || inStaleLibrary;

        // Status checks
        const state = uploadStatesRef.current.get(v.name);
        // We consider 'ready' as something that exists.
        // If it's ready, we *probably* don't need to re-upload regardless of Reuse flag.
        // BUT if user explicitly UNCHECKS Reuse, they might want to overwrite.
        // However, Facebook upload API is idempotent for same file content (usually).
        // Let's stick to the safe path:
        // If it's processing/uploading/queued -> SKIP (it's active).
        const isProcessingOrQueued =
          state?.status === 'processing' ||
          state?.status === 'uploading' ||
          state?.status === 'queued';

        if (isProcessingOrQueued) return false;

        // If reusing and found in library, skip
        if (reuseCreatives && isInLibrary) return false;

        // If reusing and ready (uploaded success), skip
        if (reuseCreatives && state?.status === 'ready') return false;

        // Otherwise upload
        return true;
      });

      if (videosToUpload.length > 0) {
        setCreationProgress({
          current: 0,
          total: totalSelectedCount,
          message: `Uploading ${videosToUpload.length} video(s)...`
        });

        // Trigger upload
        await uploader.uploadVideos(videosToUpload.map(v => v.name));
      }

      // 2. Poll for readiness
      // Limit to 5 minutes
      const startTime = Date.now();
      const TIMEOUT_MS = 5 * 60 * 1000;

      while (true) {
        // Re-check status from refs to get fresh state during async loop
        const currentStates = uploadStatesRef.current;
        const library = libraryMapRef.current;

        // Check if any selected video is NOT ready
        const pendingVideos = selectedVideos.filter(v => {
          const state = currentStates.get(v.name);
          const libEntry = library.get(v.name);

          const isInLibrary = !!libEntry;
          const isUploadedReady = state?.status === 'ready';
          const isFailed = state?.status === 'failed';

          // If it failed, we stop waiting (it will fail creation step)
          if (isFailed) return false;

          // If it's ready (either in lib or uploaded), we're good
          if (isInLibrary || isUploadedReady) return false;

          // Otherwise, it's pending
          return true;
        });

        if (pendingVideos.length === 0) {
          break; // All ready or failed
        }

        if (Date.now() - startTime > TIMEOUT_MS) {
          throw new Error('Timeout waiting for video uploads');
        }

        setCreationProgress({
          current: 0,
          total: totalSelectedCount,
          message: `Processing videos... (${pendingVideos.length} remaining)`
        });

        await delay(3000);
      }

      // 3. Map template → config
      const { pageId, adCreative } = mapTemplateCreative(templateCreative, adStatus);

      // 4. Build MediaItemForAd[] (using fresh state)
      // We need to pull the LATEST fbVideoId/thumbnail from the uploader state/library
      const mediaItems: MediaItemForAd[] = [
        ...selectedVideos.map((v) => {
          const state = uploadStatesRef.current.get(v.name);
          const lib = libraryMapRef.current.get(v.name);

          // Prefer library data, then upload state, then initial data
          const fbVideoId = lib?.fbVideoId ?? state?.fbVideoId ?? v.fbVideoId;
          const thumb = lib?.thumbnailUrl ?? state?.thumbnailUrl ?? v.fbThumbnailUrl ?? v.thumbnailUrl;

          return {
            type: 'video' as const,
            name: v.name,
            fbVideoId: fbVideoId ?? null,
            thumbnailUrl: thumb ?? null,
          };
        }),
        ...selectedImages.map((i) => ({
          type: 'image' as const,
          name: i.name,
          url: i.image_url || i.image_drive_link || i.thumbnailUrl || '',
        })),
      ];

      // 5. Create with retry
      const result = await createAdsWithRetry({
        accessToken,
        adAccountId,
        adSetId,
        pageId,
        adCreative,
        mediaItems,
        onProgress: setCreationProgress,
      });

      setCreationResult(result);

      // 6. Update usage in Airtable (fire-and-forget)
      if (result.succeededMediaNames.length > 0) {
        // Update Videos
        const succeededVideos = selectedVideos
          .filter(v => result.succeededMediaNames.includes(v.name))
          .map(v => v.id);

        if (succeededVideos.length > 0) {
          updateVideoUsage(succeededVideos, campaignId).catch((err: unknown) => {
            console.error('Failed to update video usage:', err);
          });
        }

        // Update Images (Link to Campaign)
        const succeededImages = selectedImages
          .filter(i => result.succeededMediaNames.includes(i.name))
          .map(i => i.id);

        if (succeededImages.length > 0) {
          addImageIdsToCampaign(campaignId, succeededImages).catch((err: unknown) => {
            console.error('Failed to attach images to campaign:', err);
          });
        }
      }
    } catch (err) {
      setCreationResult({
        success: 0,
        failed: totalSelectedCount,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
        succeededMediaNames: [],
      });
    } finally {
      setIsCreating(false);
      setCreationProgress(null);
    }
  }, [
    campaignId,
    templateCreative,
    adStatus,
    selectedVideos,
    selectedImages,
    accessToken,
    adAccountId,
    adSetId,
    totalSelectedCount,
    uploader,
  ]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    availableVideos,
    availableImages,
    selectedVideoIds,
    selectedImageIds,
    toggleVideo,
    toggleImage,
    uploader,
    templateCreative,
    isLoadingTemplate,
    templateError,
    allMediaReady,
    readyCount,
    totalSelectedCount,
    adStatus,
    setAdStatus,
    reuseCreatives,
    setReuseCreatives,
    createAds,
    isCreating,
    creationProgress,
    creationResult,
  };
}

// =============================================================================
// BATCH CREATION WITH RETRY
// =============================================================================

interface CreateAdsWithRetryParams {
  accessToken: string;
  adAccountId: string;
  adSetId: string;
  pageId: string;
  adCreative: ReturnType<typeof mapTemplateCreative>['adCreative'];
  mediaItems: MediaItemForAd[];
  onProgress: (p: CreationProgress) => void;
  maxRetries?: number;
}

async function createAdsWithRetry({
  accessToken,
  adAccountId,
  adSetId,
  pageId,
  adCreative,
  mediaItems,
  onProgress,
  maxRetries = 3,
}: CreateAdsWithRetryParams): Promise<CreationResult> {
  let pending = [...mediaItems];
  const succeeded: string[] = [];
  const failedFinal: { name: string; error: string }[] = [];
  const retryMap = new Map<string, number>(); // name → attempt count

  while (pending.length > 0) {
    const batches = chunkArray(pending, 25);
    const nextPending: MediaItemForAd[] = [];

    for (const batch of batches) {
      onProgress({
        current: succeeded.length,
        total: mediaItems.length,
        message: `Creating ads… (${succeeded.length}/${mediaItems.length})`,
      });

      const { data } = await createAdsBatch(
        accessToken,
        adAccountId,
        adSetId,
        pageId,
        batch,
        adCreative,
      );

      // Parse per-item results
      if (Array.isArray(data)) {
        data.forEach((item: FbBatchResponseItem, idx: number) => {
          const media = batch[idx];
          if (item.code === 200) {
            succeeded.push(media.name);
          } else {
            const attempts = (retryMap.get(media.name) ?? 0) + 1;
            retryMap.set(media.name, attempts);

            let errorMsg = 'Unknown error';
            try {
              const body = JSON.parse(item.body);
              errorMsg = body.error?.message ?? errorMsg;
            } catch {
              // ignore parse error
            }

            if (attempts < maxRetries) {
              nextPending.push(media);
            } else {
              failedFinal.push({ name: media.name, error: errorMsg });
            }
          }
        });
      }
    }

    pending = nextPending;
    if (pending.length > 0) await delay(2000);
  }

  onProgress({
    current: mediaItems.length,
    total: mediaItems.length,
    message: 'Done',
  });

  return {
    success: succeeded.length,
    failed: failedFinal.length,
    errors: failedFinal.map((f) => `${f.name}: ${f.error}`),
    succeededMediaNames: succeeded,
  };
}
