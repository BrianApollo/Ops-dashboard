/**
 * usePrelaunchUploader
 *
 * Manages video library checking and uploading for the prelaunch page.
 * Tracks per-video upload status for UI feedback.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as fbLaunchApi from '../../../../../features/campaigns/launch/fbLaunchApi';
import { processVideoUploadQueue } from '../../../../../features/campaigns/launch/utils/uploadHelpers';

// =============================================================================
// TYPES
// =============================================================================

export type VideoUploadStatus = 'idle' | 'queued' | 'uploading' | 'processing' | 'ready' | 'failed';

export interface VideoUploadState {
  name: string;
  status: VideoUploadStatus;
  fbVideoId?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface VideoForUpload {
  id: string;
  name: string;
  creativeLink?: string;
}

export interface UsePrelaunchUploaderOptions {
  accessToken: string | null;
  adAccountId: string | null;
  videos: VideoForUpload[];
  /** Poll interval in ms for checking processing status (default: 5000) */
  pollIntervalMs?: number;
  /** Max poll attempts before giving up (default: 60 = 5 minutes at 5s intervals) */
  maxPollAttempts?: number;
}

export interface UsePrelaunchUploaderReturn {
  /** Map of video name to its current upload state */
  uploadStates: Map<string, VideoUploadState>;
  /** Videos that are ready (in library with thumbnail) */
  libraryMap: Map<string, { fbVideoId: string; thumbnailUrl: string }>;
  /** Check which videos already exist in the library */
  checkLibrary: () => Promise<Map<string, { fbVideoId: string; thumbnailUrl: string }>>;
  /** Upload videos to the library */
  uploadVideos: (videoNames: string[]) => Promise<void>;
  /** Upload all videos not in library */
  uploadAllNotInLibrary: () => Promise<void>;
  /** Overall loading states */
  isChecking: boolean;
  isUploading: boolean;
  isPolling: boolean;
  /** Error message if any */
  error: string | null;
  /** Reset all state (e.g., when ad account changes) */
  reset: () => void;
  /** Count of videos currently processing */
  processingCount: number;
  /** Count of videos ready */
  readyCount: number;
  /** Count of videos failed */
  failedCount: number;
}

// =============================================================================
// HOOK
// =============================================================================

export function usePrelaunchUploader({
  accessToken,
  adAccountId,
  videos,
  pollIntervalMs = 5000,
  maxPollAttempts = 60,
}: UsePrelaunchUploaderOptions): UsePrelaunchUploaderReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [uploadStates, setUploadStates] = useState<Map<string, VideoUploadState>>(new Map());
  const [libraryMap, setLibraryMap] = useState<Map<string, { fbVideoId: string; thumbnailUrl: string }>>(new Map());
  const [isChecking, setIsChecking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for polling - use refs to avoid stale closures
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptRef = useRef(0);
  const uploadStatesRef = useRef(uploadStates);
  const accessTokenRef = useRef(accessToken);
  const adAccountIdRef = useRef(adAccountId);

  // Keep refs in sync
  useEffect(() => {
    uploadStatesRef.current = uploadStates;
  }, [uploadStates]);

  useEffect(() => {
    accessTokenRef.current = accessToken;
    adAccountIdRef.current = adAccountId;
  }, [accessToken, adAccountId]);

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  const updateVideoState = useCallback((name: string, updates: Partial<VideoUploadState>) => {
    setUploadStates(prev => {
      const next = new Map(prev);
      const current = next.get(name) || { name, status: 'idle' as VideoUploadStatus };
      next.set(name, { ...current, ...updates });
      return next;
    });
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollAttemptRef.current = 0;
    setIsPolling(false);
  }, []);

  // ---------------------------------------------------------------------------
  // POLL PROCESSING VIDEOS (uses refs to avoid stale closures)
  // ---------------------------------------------------------------------------

  const pollProcessingVideos = useCallback(async () => {
    const token = accessTokenRef.current;
    const accountId = adAccountIdRef.current;
    if (!token || !accountId) return;

    // Get videos that are processing and have fbVideoId - use ref for fresh state
    const currentStates = uploadStatesRef.current;
    const processingVideos = Array.from(currentStates.values()).filter(
      v => v.status === 'processing' && v.fbVideoId
    );

    if (processingVideos.length === 0) {
      stopPolling();
      return;
    }

    pollAttemptRef.current++;

    // Check if we've exceeded max attempts
    if (pollAttemptRef.current > maxPollAttempts) {
      console.warn('Max poll attempts reached, stopping polling');
      processingVideos.forEach(v => {
        updateVideoState(v.name, { status: 'failed', error: 'Processing timeout' });
      });
      stopPolling();
      return;
    }

    try {
      const videoIds = processingVideos.map(v => v.fbVideoId!);
      const { data } = await fbLaunchApi.pollLibrary(token, accountId, videoIds);

      if (data.data) {
        const resultMap = new Map(data.data.map(v => [v.id, v]));

        processingVideos.forEach(video => {
          const result = resultMap.get(video.fbVideoId!);
          if (result) {
            if (result.status?.video_status === 'ready' && result.picture) {
              // Video is ready
              updateVideoState(video.name, {
                status: 'ready',
                thumbnailUrl: result.picture,
              });
              // Update library map
              setLibraryMap(prev => {
                const next = new Map(prev);
                next.set(video.name, {
                  fbVideoId: video.fbVideoId!,
                  thumbnailUrl: result.picture!,
                });
                return next;
              });
            } else if (result.status?.video_status === 'error') {
              updateVideoState(video.name, {
                status: 'failed',
                error: 'Video processing failed',
              });
            }
            // Otherwise still processing, no change needed
          }
        });
      }
    } catch (err) {
      console.error('Poll failed:', err);
      // Don't stop polling on single error, just log it
    }
  }, [maxPollAttempts, stopPolling, updateVideoState]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return; // Already polling

    setIsPolling(true);
    pollAttemptRef.current = 0;

    // Poll immediately, then at intervals
    pollProcessingVideos();
    pollIntervalRef.current = setInterval(pollProcessingVideos, pollIntervalMs);
  }, [pollProcessingVideos, pollIntervalMs]);

  // ---------------------------------------------------------------------------
  // CHECK LIBRARY
  // ---------------------------------------------------------------------------

  const checkLibrary = useCallback(async (): Promise<Map<string, { fbVideoId: string; thumbnailUrl: string }>> => {
    if (!accessToken || !adAccountId) {
      setError('Please select a profile and ad account first');
      return new Map();
    }

    const videoNames = videos.map(v => v.name);
    if (videoNames.length === 0) return new Map();

    setIsChecking(true);
    setError(null);

    try {
      const { data } = await fbLaunchApi.checkLibraryByName(
        accessToken,
        adAccountId,
        videoNames
      );

      const newLibraryMap = new Map<string, { fbVideoId: string; thumbnailUrl: string }>();

      if (data.data) {
        data.data.forEach(item => {
          if (item.title && item.id && item.status?.video_status === 'ready' && item.picture) {
            newLibraryMap.set(item.title, {
              fbVideoId: item.id,
              thumbnailUrl: item.picture,
            });
            // Update upload state to ready
            updateVideoState(item.title, {
              status: 'ready',
              fbVideoId: item.id,
              thumbnailUrl: item.picture,
            });
          } else if (item.title && item.id && item.status?.video_status === 'processing') {
            // Video exists but still processing
            updateVideoState(item.title, {
              status: 'processing',
              fbVideoId: item.id,
              thumbnailUrl: item.picture, // Might be available even if processing? Actually usually not until ready, or valid but partial.
            });
          }
        });
      }

      setLibraryMap(newLibraryMap);

      // Check if there are videos still processing that need polling
      // Use a slight delay to ensure state has updated
      setTimeout(() => {
        const currentStates = uploadStatesRef.current;
        const processingVideos = Array.from(currentStates.values()).filter(
          v => v.status === 'processing' && v.fbVideoId
        );
        if (processingVideos.length > 0 && !pollIntervalRef.current) {
          startPolling();
        }
      }, 100);

      return newLibraryMap;
    } catch (err) {
      console.error('Library check failed:', err);
      setError((err as Error).message || 'Failed to check video library');
      return new Map();
    } finally {
      setIsChecking(false);
    }
  }, [accessToken, adAccountId, videos, updateVideoState, startPolling]);

  // ---------------------------------------------------------------------------
  // UPLOAD VIDEOS
  // ---------------------------------------------------------------------------

  const uploadVideos = useCallback(async (videoNames: string[]) => {
    if (!accessToken || !adAccountId) {
      setError('Please select a profile and ad account first');
      return;
    }

    // Get video objects with URLs
    const videosToUpload = videos.filter(
      v => videoNames.includes(v.name) && v.creativeLink
    );

    if (videosToUpload.length === 0) return;

    setIsUploading(true);
    setError(null);

    // Mark all as queued
    videosToUpload.forEach(v => {
      updateVideoState(v.name, { status: 'queued' });
    });

    try {
      // Use shared helper
      await processVideoUploadQueue(
        videosToUpload.map(v => ({
          id: v.name, // Use name as ID since it's unique in this context
          name: v.name,
          url: v.creativeLink!
        })),
        {
          accessToken,
          adAccountId,
          batchSize: 10,
          delayBetweenBatchesMs: 1000,
          onBatchStart: (batch: { name: string }[]) => {
            batch.forEach(item => {
              updateVideoState(item.name, { status: 'uploading' });
            });
          },
          onItemComplete: (result: { item: { name: string }, success: boolean, fbVideoId?: string, error?: string }) => {
            if (result.success && result.fbVideoId) {
              updateVideoState(result.item.name, {
                status: 'processing',
                fbVideoId: result.fbVideoId
              });
            } else {
              updateVideoState(result.item.name, {
                status: 'failed',
                error: result.error || 'Upload failed'
              });
            }
          },
          maxRetries: 3,
          retryDelayMs: 2000
        }
      );

      // Start polling for processing videos after a short delay
      setTimeout(() => {
        startPolling();
      }, 100);
    } catch (err) {
      console.error('Upload failed:', err);
      setError((err as Error).message || 'Failed to upload videos');
      // Mark remaining queued/uploading as failed
      const currentStates = uploadStatesRef.current;
      videosToUpload.forEach(v => {
        const state = currentStates.get(v.name);
        if (state && (state.status === 'queued' || state.status === 'uploading')) {
          updateVideoState(v.name, { status: 'failed', error: 'Upload aborted' });
        }
      });
    } finally {
      setIsUploading(false);
    }
  }, [accessToken, adAccountId, videos, updateVideoState, startPolling]);

  const uploadAllNotInLibrary = useCallback(async () => {
    const currentStates = uploadStatesRef.current;
    const notInLibrary = videos
      .filter(v => {
        const state = currentStates.get(v.name);
        const inLibrary = libraryMap.has(v.name);
        const isProcessing = state?.status === 'processing';
        const isUploading = state?.status === 'uploading' || state?.status === 'queued';
        return !inLibrary && !isProcessing && !isUploading && v.creativeLink;
      })
      .map(v => v.name);

    if (notInLibrary.length > 0) {
      await uploadVideos(notInLibrary);
    }
  }, [videos, libraryMap, uploadVideos]);

  // ---------------------------------------------------------------------------
  // RESET
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    stopPolling();
    setUploadStates(new Map());
    setLibraryMap(new Map());
    setError(null);
    setIsChecking(false);
    setIsUploading(false);
    setIsPolling(false);
  }, [stopPolling]);

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const processingCount = Array.from(uploadStates.values()).filter(
    v => v.status === 'processing'
  ).length;

  const readyCount = libraryMap.size;

  const failedCount = Array.from(uploadStates.values()).filter(
    v => v.status === 'failed'
  ).length;

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    uploadStates,
    libraryMap,
    checkLibrary,
    uploadVideos,
    uploadAllNotInLibrary,
    isChecking,
    isUploading,
    isPolling,
    error,
    reset,
    processingCount,
    readyCount,
    failedCount,
  };
}
