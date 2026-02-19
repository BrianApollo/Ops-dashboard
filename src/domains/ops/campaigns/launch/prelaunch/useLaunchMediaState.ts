/**
 * useLaunchMediaState
 *
 * Derives available media for campaign launch:
 * - baseVideos (for prelaunch uploader)
 * - availableVideos (merged with library/upload state)
 * - availableImages
 *
 * Pure derivation only - no effects, no writes.
 *
 * Extracted from useCampaignLaunchController (Phase 7.2 Step 6A).
 */

import { useMemo } from 'react';
import type { useVideosController } from '../../../../../features/videos/useVideosController';
import type { useImagesController } from '../../../../../features/images';
import type { usePrelaunchUploader } from './usePrelaunchUploader';
import type { SelectableVideo, SelectableImage } from '../types';

// Base video type for prelaunch uploader
export interface BaseVideo {
  id: string;
  name: string;
  creativeLink: string;
}

export interface UseLaunchMediaStateOptions {
  productId: string | undefined;
  videosController: ReturnType<typeof useVideosController>;
  imagesController: ReturnType<typeof useImagesController>;
  prelaunchUploader: ReturnType<typeof usePrelaunchUploader>;
}

export interface UseLaunchMediaStateReturn {
  baseVideos: BaseVideo[];
  availableVideos: SelectableVideo[];
  availableImages: SelectableImage[];
}

export function useLaunchMediaState({
  productId,
  videosController,
  imagesController,
  prelaunchUploader,
}: UseLaunchMediaStateOptions): UseLaunchMediaStateReturn {
  // ---------------------------------------------------------------------------
  // BASE VIDEOS (without library/upload state - needed for prelaunch uploader)
  // ---------------------------------------------------------------------------
  const baseVideos = useMemo((): BaseVideo[] => {
    if (!productId) return [];
    return videosController.list.allRecords
      .filter((v) => v.product.id === productId && ['available', 'review'].includes(v.status) && v.format.toLowerCase() !== 'youtube')
      .map((v) => ({
        id: v.id,
        name: v.name,
        creativeLink: v.creativeLink || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videosController.list.allRecords, productId]);

  // ---------------------------------------------------------------------------
  // AVAILABLE VIDEOS (filtered by product, merged with upload state)
  // ---------------------------------------------------------------------------
  const availableVideos = useMemo((): SelectableVideo[] => {
    if (!productId) return [];
    return videosController.list.allRecords
      .filter((v) => v.product.id === productId && ['available', 'review'].includes(v.status) && v.format.toLowerCase() !== 'youtube')
      .map((v) => {
        const libraryEntry = prelaunchUploader.libraryMap.get(v.name);
        const uploadState = prelaunchUploader.uploadStates.get(v.name);
        return {
          id: v.id,
          name: v.name,
          status: v.status,
          format: v.format,
          creativeLink: v.creativeLink,
          productId: v.product.id,
          inLibrary: !!libraryEntry,
          fbVideoId: libraryEntry?.fbVideoId || uploadState?.fbVideoId,
          fbThumbnailUrl: libraryEntry?.thumbnailUrl || uploadState?.thumbnailUrl,
          uploadStatus: uploadState?.status,
          uploadError: uploadState?.error,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videosController.list.allRecords, productId, prelaunchUploader.libraryMap, prelaunchUploader.uploadStates]);

  // ---------------------------------------------------------------------------
  // AVAILABLE IMAGES (filtered by product)
  // ---------------------------------------------------------------------------
  const availableImages = useMemo((): SelectableImage[] => {
    if (!productId) return [];
    return imagesController.images
      .filter((i) => i.product.id === productId && i.status !== 'new' && (i.status === 'available' || i.usedInCampaigns.length === 0))
      .map((i) => ({
        id: i.id,
        name: i.name,
        status: i.status,
        imageType: i.imageType,
        thumbnailUrl: i.thumbnailUrl,
        driveFileId: i.driveFileId,
        image_drive_link: i.image_drive_link,
        productId: i.product.id,
      }));
    // .sort((a, b) => a.name.localeCompare(b.name));
  }, [imagesController.images, productId]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    baseVideos,
    availableVideos,
    availableImages,
  };
}
