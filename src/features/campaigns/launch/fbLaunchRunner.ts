/**
 * Pipeline Flow - Orchestration Logic
 *
 * This file manages:
 * - State tracking for all media items
 * - Batching logic
 * - Tick loop for polling
 * - Retry logic with fallback URLs
 * - Start/stop/resume controls
 *
 * Uses fbLaunchApi.ts for all API calls.
 */

import * as fb from './fbLaunchApi';
import type {
  CampaignConfig,
  AdSetConfig,
  AdCreativeConfig,
} from './fbLaunchApi';

// =============================================================================
// TYPES
// =============================================================================

export type MediaType = 'video' | 'image';
export type MediaStage = 'upload' | 'poll' | 'ad' | 'done' | 'failed';
export type MediaStatus = 'queued' | 'in_progress' | 'retry' | 'completed' | 'failed';
export type LaunchPhase =
  | 'idle'
  | 'checking'
  | 'uploading'
  | 'polling'
  | 'creating_campaign'
  | 'creating_ads'
  | 'stopped'
  | 'complete'
  | 'error';

export interface FbLaunchMediaInput {
  type: MediaType;
  name: string;
  url: string;
  fallbackUrl?: string;
  fbVideoId?: string | null;
}

export interface FbLaunchMediaState extends FbLaunchMediaInput {
  stage: MediaStage;
  status: MediaStatus;
  retryCount: number;
  usedFallback: boolean;
  fbVideoId: string | null;
  thumbnailUrl: string | null;
  adId: string | null;
  error: string | null;
}

export interface FbLaunchOptions {
  checkLibraryFirst?: boolean;
  forceReupload?: boolean;
  uploadBatchSize?: number;
  adBatchSize?: number;
  uploadStaggerMs?: number;
  tickIntervalMs?: number;
  initialPollDelayMs?: number;
  maxTicks?: number;
  maxRetries?: number;
}

export interface FbLaunchInput {
  accessToken: string;
  adAccountId: string;
  pageId: string;
  pixelId: string;
  campaign: CampaignConfig;
  adSet: AdSetConfig;
  adCreative: AdCreativeConfig;
  media: FbLaunchMediaInput[];
  options?: FbLaunchOptions;
}

export interface FbLaunchStats {
  upload: {
    queued: number;
    inProgress: number;
    failed: number;
  };
  poll: {
    waiting: number;
  };
  ad: {
    queued: number;
    inProgress: number;
    failed: number;
  };
  done: number;
  failed: number;
  total: number;
}

export interface FbLaunchState {
  phase: LaunchPhase;
  isRunning: boolean;
  isStopped: boolean;
  campaignId: string | null;
  adsetId: string | null;
  tick: number;
  rate: number;
  startTime: number | null;
  elapsed: number;
  media: FbLaunchMediaState[];
  stats?: FbLaunchStats;
  error?: string;
}

export type OnProgressCallback = (state: FbLaunchState) => void;

export interface FbLaunchController {
  start: () => Promise<FbLaunchState>;
  stop: () => void;
  getState: () => FbLaunchState;
  retryFailed: () => void;
  runPhase: (phase: 'check' | 'upload' | 'campaign' | 'ads' | 'poll') => Promise<FbLaunchState>;
}

// =============================================================================
// HELPERS
// =============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getStats(media: FbLaunchMediaState[]): FbLaunchStats {
  return {
    upload: {
      queued: media.filter(m => m.type === 'video' && m.stage === 'upload' && m.status === 'queued').length,
      inProgress: media.filter(m => m.type === 'video' && m.stage === 'upload' && m.status === 'in_progress').length,
      failed: media.filter(m => m.type === 'video' && m.stage === 'upload' && m.status === 'failed').length,
    },
    poll: {
      waiting: media.filter(m => m.type === 'video' && m.stage === 'poll').length,
    },
    ad: {
      queued: media.filter(m => m.stage === 'ad' && (m.status === 'queued' || m.status === 'retry')).length,
      inProgress: media.filter(m => m.stage === 'ad' && m.status === 'in_progress').length,
      failed: media.filter(m => m.stage === 'ad' && m.status === 'failed').length,
    },
    done: media.filter(m => m.stage === 'done').length,
    failed: media.filter(m => m.stage === 'failed').length,
    total: media.length,
  };
}

// =============================================================================
// CONTROLLER FACTORY
// =============================================================================

/**
 * Create a pipeline controller
 */
export function createController(
  input: FbLaunchInput,
  onProgress?: OnProgressCallback
): FbLaunchController {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const state: FbLaunchState = {
    phase: 'idle',
    isRunning: false,
    isStopped: false,
    campaignId: null,
    adsetId: null,
    tick: 0,
    rate: 0,
    startTime: null,
    elapsed: 0,
    media: input.media.map(item => ({
      ...item,
      stage: (item.type === 'video' && !item.fbVideoId ? 'upload' : 'ad') as MediaStage,
      status: 'queued' as MediaStatus,
      retryCount: 0,
      usedFallback: false,
      fbVideoId: item.fbVideoId || null,
      thumbnailUrl: null,
      adId: null,
      error: null,
    })),
  };

  // Options with defaults
  const options: Required<FbLaunchOptions> = {
    checkLibraryFirst: true,
    forceReupload: false,
    uploadBatchSize: 10,
    adBatchSize: 25,
    uploadStaggerMs: 1000,
    tickIntervalMs: 10000,
    initialPollDelayMs: 8000,
    maxTicks: 15,
    maxRetries: 3,
    ...input.options,
  };

  // ---------------------------------------------------------------------------
  // PROGRESS UPDATE
  // ---------------------------------------------------------------------------
  function emitProgress(): void {
    state.elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
    state.stats = getStats(state.media);

    if (onProgress) {
      onProgress({ ...state });
    }
  }

  // ---------------------------------------------------------------------------
  // CHECK LIBRARY
  // ---------------------------------------------------------------------------
  async function checkLibrary(): Promise<void> {
    if (state.isStopped) return;

    state.phase = 'checking';
    emitProgress();

    const videos = state.media.filter(m => m.type === 'video');
    const videoNames = videos.map(v => v.name);

    if (videoNames.length === 0) return;

    try {
      const { data, rate } = await fb.checkLibraryByName(
        input.accessToken,
        input.adAccountId,
        videoNames
      );
      state.rate = rate;

      if (data.data) {
        const libraryMap = new Map(data.data.map(v => [v.title, v]));

        videos.forEach(video => {
          const existing = libraryMap.get(video.name);
          if (existing && existing.status?.video_status === 'ready' && existing.picture) {
            video.fbVideoId = existing.id;
            video.thumbnailUrl = existing.picture;
            video.stage = 'ad';
            video.status = 'queued';
          }
        });
      }

      emitProgress();
    } catch (err) {
      console.error('checkLibrary error:', (err as Error).message);
    }
  }

  // ---------------------------------------------------------------------------
  // UPLOAD VIDEOS
  // ---------------------------------------------------------------------------
  async function uploadVideos(): Promise<void> {
    if (state.isStopped) return;

    state.phase = 'uploading';
    emitProgress();

    const toUpload = state.media.filter(
      m => m.type === 'video' && m.stage === 'upload' && (m.status === 'queued' || m.status === 'retry')
    );

    if (toUpload.length === 0) return;

    // Split into batches
    const batches: FbLaunchMediaState[][] = [];
    for (let i = 0; i < toUpload.length; i += options.uploadBatchSize) {
      batches.push(toUpload.slice(i, i + options.uploadBatchSize));
    }

    // Mark all as in_progress
    toUpload.forEach(v => (v.status = 'in_progress'));
    emitProgress();

    // Upload batches with stagger
    for (let i = 0; i < batches.length; i++) {
      if (state.isStopped) break;

      const batch = batches[i];

      // Stagger between batches
      if (i > 0) {
        await delay(options.uploadStaggerMs);
      }

      try {
        const videosToSend = batch.map(v => ({
          name: v.name,
          url: v.usedFallback ? (v.fallbackUrl || v.url) : v.url,
        }));

        const { data, rate } = await fb.uploadVideoBatch(
          input.accessToken,
          input.adAccountId,
          videosToSend
        );
        state.rate = rate;

        // Handle response
        if (Array.isArray(data)) {
          data.forEach((item, idx) => {
            const video = batch[idx];
            if (item.code === 200) {
              const body = JSON.parse(item.body);
              if (body.id) {
                video.fbVideoId = body.id;
                video.stage = 'poll';
                video.status = 'queued';
              } else {
                handleUploadFailure(video);
              }
            } else {
              handleUploadFailure(video);
            }
          });
        } else {
          // Non-array response (error)
          batch.forEach(video => handleUploadFailure(video));
        }

        emitProgress();
      } catch (err) {
        console.error('uploadVideoBatch error:', (err as Error).message);
        batch.forEach(video => handleUploadFailure(video));
        emitProgress();
      }
    }
  }

  function handleUploadFailure(video: FbLaunchMediaState): void {
    video.retryCount++;

    // Try fallback URL if not used yet
    if (!video.usedFallback && video.fallbackUrl) {
      video.usedFallback = true;
      video.status = 'retry';
    } else if (video.retryCount < options.maxRetries) {
      video.status = 'retry';
    } else {
      video.stage = 'failed';
      video.status = 'failed';
      video.error = 'Max retries exceeded';
    }
  }

  // ---------------------------------------------------------------------------
  // POLL VIDEOS
  // ---------------------------------------------------------------------------
  async function pollVideos(): Promise<void> {
    if (state.isStopped) return;

    state.phase = 'polling';

    const toPoll = state.media.filter(m => m.type === 'video' && m.stage === 'poll' && m.fbVideoId);

    if (toPoll.length === 0) return;

    try {
      const videoIds = toPoll.map(v => v.fbVideoId!);
      const { data, rate } = await fb.pollLibrary(input.accessToken, input.adAccountId, videoIds);
      state.rate = rate;

      if (data.data) {
        const libraryMap = new Map(data.data.map(v => [v.id, v]));

        toPoll.forEach(video => {
          const libEntry = libraryMap.get(video.fbVideoId!);
          if (libEntry && libEntry.status?.video_status === 'ready' && libEntry.picture) {
            video.thumbnailUrl = libEntry.picture;
            video.stage = 'ad';
            video.status = 'queued';
          }
        });
      }

      emitProgress();
    } catch (err) {
      console.error('pollVideos error:', (err as Error).message);
    }
  }

  // ---------------------------------------------------------------------------
  // CREATE CAMPAIGN & AD SET
  // ---------------------------------------------------------------------------
  async function createCampaignAndAdSet(): Promise<void> {
    if (state.isStopped) return;
    if (state.campaignId && state.adsetId) return; // Already created

    state.phase = 'creating_campaign';
    emitProgress();

    try {
      // Create campaign
      const { data: campData, rate: campRate } = await fb.createCampaign(
        input.accessToken,
        input.adAccountId,
        input.campaign
      );
      state.rate = campRate;

      if (campData.error) {
        throw new Error(`Campaign: ${campData.error.message}`);
      }
      state.campaignId = campData.id || null;
      emitProgress();

      if (state.isStopped) return;

      // Create ad set
      const { data: adsetData, rate: adsetRate } = await fb.createAdSet(
        input.accessToken,
        input.adAccountId,
        state.campaignId!,
        input.adSet,
        input.pixelId
      );
      state.rate = adsetRate;

      if (adsetData.error) {
        throw new Error(`AdSet: ${adsetData.error.message}`);
      }
      state.adsetId = adsetData.id || null;
      emitProgress();
    } catch (err) {
      console.error('createCampaignAndAdSet error:', (err as Error).message);
      state.phase = 'error';
      state.error = (err as Error).message;
      emitProgress();
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // CREATE ADS
  // ---------------------------------------------------------------------------
  async function createAds(): Promise<void> {
    if (state.isStopped) return;

    state.phase = 'creating_ads';

    const toCreate = state.media.filter(
      m => m.stage === 'ad' && (m.status === 'queued' || m.status === 'retry')
    );

    if (toCreate.length === 0) return;

    // Split into batches
    const batches: FbLaunchMediaState[][] = [];
    for (let i = 0; i < toCreate.length; i += options.adBatchSize) {
      batches.push(toCreate.slice(i, i + options.adBatchSize));
    }

    for (const batch of batches) {
      if (state.isStopped) break;

      // Mark as in_progress
      batch.forEach(m => (m.status = 'in_progress'));
      emitProgress();

      try {
        const { data, rate } = await fb.createAdsBatch(
          input.accessToken,
          input.adAccountId,
          state.adsetId!,
          input.pageId,
          batch,
          input.adCreative
        );
        state.rate = rate;

        // Handle response
        if (Array.isArray(data)) {
          data.forEach((item, idx) => {
            const media = batch[idx];
            if (item.code === 200) {
              const body = JSON.parse(item.body);
              if (body.id) {
                media.adId = body.id;
                media.stage = 'done';
                media.status = 'completed';
              } else {
                handleAdFailure(media);
              }
            } else {
              handleAdFailure(media);
            }
          });
        } else {
          // Non-array response (error)
          batch.forEach(media => handleAdFailure(media));
        }

        emitProgress();
      } catch (err) {
        console.error('createAdsBatch error:', (err as Error).message);
        batch.forEach(media => handleAdFailure(media));
        emitProgress();
      }
    }
  }

  function handleAdFailure(media: FbLaunchMediaState): void {
    media.retryCount++;

    // Try fallback URL for images
    if (media.type === 'image' && !media.usedFallback && media.fallbackUrl) {
      media.usedFallback = true;
      media.url = media.fallbackUrl;
      media.status = 'retry';
    } else if (media.retryCount < options.maxRetries) {
      media.status = 'retry';
    } else {
      media.stage = 'failed';
      media.status = 'failed';
      media.error = 'Max retries exceeded';
    }
  }

  // ---------------------------------------------------------------------------
  // TICK LOOP
  // ---------------------------------------------------------------------------
  async function runTickLoop(): Promise<void> {
    // Initial poll delay
    await delay(options.initialPollDelayMs);

    while (state.tick < options.maxTicks && !state.isStopped) {
      state.tick++;
      emitProgress();

      // 1. Poll videos waiting for processing
      await pollVideos();

      // 2. Create ads for ready items
      await createAds();

      // 3. Retry failed uploads
      const hasUploadRetries = state.media.some(
        m => m.type === 'video' && m.stage === 'upload' && m.status === 'retry'
      );
      if (hasUploadRetries) {
        await uploadVideos();
      }

      // 4. Check if done
      const stats = getStats(state.media);
      if (stats.done + stats.failed === stats.total) {
        state.phase = 'complete';
        emitProgress();
        break;
      }

      // 5. Wait before next tick
      if (state.tick < options.maxTicks && !state.isStopped) {
        await delay(options.tickIntervalMs);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // MAIN START
  // ---------------------------------------------------------------------------
  async function start(): Promise<FbLaunchState> {
    if (state.isRunning) return state;

    state.isRunning = true;
    state.isStopped = false;
    state.startTime = Date.now();
    emitProgress();

    try {
      // Step 1: Check library (optional)
      if (options.checkLibraryFirst && !options.forceReupload) {
        await checkLibrary();
      }

      if (state.isStopped) return state;

      // Step 2: Upload videos
      await uploadVideos();

      if (state.isStopped) return state;

      // Step 3: Create campaign & ad set
      await createCampaignAndAdSet();

      if (state.isStopped) return state;

      // Step 4: Run tick loop (poll + create ads)
      await runTickLoop();

      // Final state
      if (!state.isStopped) {
        state.phase = 'complete';
      }
      state.isRunning = false;
      emitProgress();

      return state;
    } catch (err) {
      state.phase = 'error';
      state.error = (err as Error).message;
      state.isRunning = false;
      emitProgress();
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // STOP
  // ---------------------------------------------------------------------------
  function stop(): void {
    state.isStopped = true;
    state.phase = 'stopped';
    state.isRunning = false;
    emitProgress();
  }

  // ---------------------------------------------------------------------------
  // GET STATE
  // ---------------------------------------------------------------------------
  function getState(): FbLaunchState {
    state.stats = getStats(state.media);
    return { ...state };
  }

  // ---------------------------------------------------------------------------
  // RETRY FAILED
  // ---------------------------------------------------------------------------
  function retryFailed(): void {
    state.media.forEach(m => {
      if (m.status === 'failed') {
        m.status = 'retry';
        m.retryCount = 0;
        m.error = null;
        // Reset stage based on type and what's missing
        if (m.type === 'video' && !m.fbVideoId) {
          m.stage = 'upload';
        } else if (m.type === 'video' && !m.thumbnailUrl) {
          m.stage = 'poll';
        } else {
          m.stage = 'ad';
        }
      }
    });
    emitProgress();
  }

  // ---------------------------------------------------------------------------
  // RUN SPECIFIC PHASE
  // ---------------------------------------------------------------------------
  async function runPhase(phase: 'check' | 'upload' | 'campaign' | 'ads' | 'poll'): Promise<FbLaunchState> {
    state.isStopped = false;

    switch (phase) {
      case 'check':
        await checkLibrary();
        break;
      case 'upload':
        await uploadVideos();
        break;
      case 'campaign':
        await createCampaignAndAdSet();
        break;
      case 'ads':
        await createAds();
        break;
      case 'poll':
        await pollVideos();
        break;
      default:
        console.warn(`Unknown phase: ${phase}`);
    }

    return getState();
  }

  // ---------------------------------------------------------------------------
  // RETURN CONTROLLER
  // ---------------------------------------------------------------------------
  return {
    start,
    stop,
    getState,
    retryFailed,
    runPhase,
  };
}
