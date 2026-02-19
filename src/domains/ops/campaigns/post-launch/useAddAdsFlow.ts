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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useVideosController } from '../../../../features/videos';
import { useImagesController } from '../../../../features/images';
import { getFbCreative } from '../../../../features/campaigns';
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

  // ---------------------------------------------------------------------------
  // CREATION
  // ---------------------------------------------------------------------------
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState<CreationProgress | null>(null);
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);

  const createAds = useCallback(async () => {
    if (!templateCreative || !allMediaReady) return;

    setIsCreating(true);
    setCreationResult(null);

    try {
      // 1. Map template → config
      const { pageId, adCreative } = mapTemplateCreative(templateCreative, adStatus);

      // 2. Build MediaItemForAd[]
      const mediaItems: MediaItemForAd[] = [
        ...selectedVideos.map((v) => ({
          type: 'video' as const,
          name: v.name,
          fbVideoId: v.fbVideoId ?? null,
          thumbnailUrl: v.fbThumbnailUrl ?? v.thumbnailUrl ?? null,
        })),
        ...selectedImages.map((i) => ({
          type: 'image' as const,
          name: i.name,
          url: i.image_url || i.image_drive_link || i.thumbnailUrl || '',
        })),
      ];

      // 3. Create with retry
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
    } catch (err) {
      setCreationResult({
        success: 0,
        failed: totalSelectedCount,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      });
    } finally {
      setIsCreating(false);
      setCreationProgress(null);
    }
  }, [
    templateCreative,
    allMediaReady,
    adStatus,
    selectedVideos,
    selectedImages,
    accessToken,
    adAccountId,
    adSetId,
    totalSelectedCount,
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
  };
}
