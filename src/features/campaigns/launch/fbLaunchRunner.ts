/**
 * Pipeline Flow - Orchestration Logic
 *
 * This file manages:
 * - State tracking for all media items (single state field per item)
 * - Batching logic
 * - Progress-aware tick loop for polling
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
import { processVideoUploadQueue } from './utils/uploadHelpers';

// =============================================================================
// TYPES
// =============================================================================

export type MediaType = 'video' | 'image';

/**
 * Single state per media item. Each value represents exactly where the item is
 * in the pipeline — no ambiguous stage/status combinations.
 */
export type MediaItemState =
  | 'queued'        // Waiting to upload (video) or waiting for ad creation (image)
  | 'uploading'     // Upload API call in flight
  | 'processing'    // Uploaded to FB, waiting for FB to finish processing
  | 'ready'         // FB processing done, ready for ad creation
  | 'creating_ad'   // Ad creation API call in flight
  | 'done'          // Ad created successfully
  | 'failed';       // Gave up after maxRetries

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
  state: MediaItemState;
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
  /** Exit tick loop after this many consecutive ticks with no new completions */
  maxStaleTicks?: number;
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

/** Flat stats — one count per state */
export interface FbLaunchStats {
  queued: number;
  uploading: number;
  processing: number;
  ready: number;
  creatingAd: number;
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
  maxTicks: number;
  rate: number;
  startTime: number | null;
  elapsed: number;
  media: FbLaunchMediaState[];
  stats: FbLaunchStats;
  /** Summary of what happened on the latest tick */
  tickSummary: string | null;
  error?: string;
}

export type OnProgressCallback = (state: FbLaunchState) => void;

export interface FbLaunchController {
  start: () => Promise<FbLaunchState>;
  stop: () => void;
  getState: () => FbLaunchState;
  retryFailed: () => void;
  retryItem: (name: string) => void;
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
    queued: media.filter(m => m.state === 'queued').length,
    uploading: media.filter(m => m.state === 'uploading').length,
    processing: media.filter(m => m.state === 'processing').length,
    ready: media.filter(m => m.state === 'ready').length,
    creatingAd: media.filter(m => m.state === 'creating_ad').length,
    done: media.filter(m => m.state === 'done').length,
    failed: media.filter(m => m.state === 'failed').length,
    total: media.length,
  };
}

function safeParseBatchBody(body: string): { id?: string } | null {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
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
    maxTicks: 30,
    rate: 0,
    startTime: null,
    elapsed: 0,
    media: input.media.map(item => ({
      ...item,
      state: (item.type === 'video' && !item.fbVideoId ? 'queued' : 'ready') as MediaItemState,
      retryCount: 0,
      usedFallback: false,
      fbVideoId: item.fbVideoId || null,
      thumbnailUrl: null,
      adId: null,
      error: null,
    })),
    stats: { queued: 0, uploading: 0, processing: 0, ready: 0, creatingAd: 0, done: 0, failed: 0, total: 0 },
    tickSummary: null,
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
    maxTicks: 30,
    maxRetries: 3,
    maxStaleTicks: 5,
    ...input.options,
  };

  state.maxTicks = options.maxTicks;

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
            video.state = 'ready';
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
      m => m.type === 'video' && m.state === 'queued'
    );

    if (toUpload.length === 0) return;

    // Use shared video upload helper
    await processVideoUploadQueue(
      toUpload.map(v => ({
        id: v.name, // Use name as ID
        name: v.name,
        url: v.usedFallback ? (v.fallbackUrl || v.url) : v.url,
      })),
      {
        accessToken: input.accessToken,
        adAccountId: input.adAccountId,
        batchSize: options.uploadBatchSize,
        delayBetweenBatchesMs: options.uploadStaggerMs,
        shouldStop: () => state.isStopped,
        onBatchStart: (batch: { name: string }[]) => {
          // Update state to uploading
          // We need to map back to the original media objects
          const names = new Set(batch.map(b => b.name));
          state.media.forEach(m => {
            if (m.type === 'video' && names.has(m.name)) {
              m.state = 'uploading';
            }
          });
          emitProgress();
        },
        onItemComplete: (result: { item: { name: string }, success: boolean, fbVideoId?: string, error?: string }) => {
          const video = state.media.find(m => m.name === result.item.name && m.type === 'video');
          if (!video) return;

          if (result.success && result.fbVideoId) {
            video.fbVideoId = result.fbVideoId;
            video.state = 'processing';
          } else {
            handleUploadFailure(video, result.error);
          }
          emitProgress();
        }
      }
    );
  }

  function handleUploadFailure(video: FbLaunchMediaState, reason?: string): void {
    video.retryCount++;

    // Try fallback URL if not used yet
    if (!video.usedFallback && video.fallbackUrl) {
      video.usedFallback = true;
      video.state = 'queued'; // Back to queue for retry
    } else if (video.retryCount < options.maxRetries) {
      video.state = 'queued'; // Back to queue for retry
    } else {
      video.state = 'failed';
      video.error = reason || 'Max retries exceeded';
    }
  }

  // ---------------------------------------------------------------------------
  // POLL VIDEOS
  // ---------------------------------------------------------------------------
  async function pollVideos(): Promise<void> {
    if (state.isStopped) return;

    state.phase = 'polling';

    const toPoll = state.media.filter(m => m.type === 'video' && m.state === 'processing' && m.fbVideoId);

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
            video.state = 'ready';
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

    const toCreate = state.media.filter(m => m.state === 'ready');

    if (toCreate.length === 0) return;

    // Split into batches
    const batches: FbLaunchMediaState[][] = [];
    for (let i = 0; i < toCreate.length; i += options.adBatchSize) {
      batches.push(toCreate.slice(i, i + options.adBatchSize));
    }

    for (const batch of batches) {
      if (state.isStopped) break;

      // Mark as creating_ad
      batch.forEach(m => (m.state = 'creating_ad'));
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
              const body = safeParseBatchBody(item.body);
              if (body?.id) {
                media.adId = body.id;
                media.state = 'done';
              } else {
                handleAdFailure(media, body ? 'No ad ID in response' : 'Malformed response');
              }
            } else {
              handleAdFailure(media, `HTTP ${item.code}`);
            }
          });
        } else {
          // Non-array response (error)
          batch.forEach(media => handleAdFailure(media, 'Invalid batch response'));
        }

        emitProgress();
      } catch (err) {
        console.error('createAdsBatch error:', (err as Error).message);
        batch.forEach(media => handleAdFailure(media, (err as Error).message));
        emitProgress();
      }
    }
  }

  function handleAdFailure(media: FbLaunchMediaState, reason?: string): void {
    media.retryCount++;

    // Try fallback URL for images
    if (media.type === 'image' && !media.usedFallback && media.fallbackUrl) {
      media.usedFallback = true;
      media.url = media.fallbackUrl;
      media.state = 'ready'; // Back to ready for retry
    } else if (media.retryCount < options.maxRetries) {
      media.state = 'ready'; // Back to ready for retry
    } else {
      media.state = 'failed';
      media.error = reason || 'Max retries exceeded';
    }
  }

  // ---------------------------------------------------------------------------
  // TICK LOOP (progress-aware)
  // ---------------------------------------------------------------------------
  async function runTickLoop(): Promise<void> {
    // Initial poll delay — give Facebook time to start processing
    await delay(options.initialPollDelayMs);

    let staleTicks = 0;

    while (state.tick < options.maxTicks && !state.isStopped) {
      state.tick++;

      const doneBefore = getStats(state.media).done;

      // 1. Poll videos waiting for processing
      await pollVideos();

      // 2. Create ads for ready items
      await createAds();

      // 3. Retry failed uploads (items moved back to queued)
      // CHECK: any queued video means we should try uploading.
      // This covers both automatic retries and MANUAL retries (where we reset retryCount).
      const hasUploadRetries = state.media.some(
        m => m.type === 'video' && m.state === 'queued'
      );
      if (hasUploadRetries) {
        await uploadVideos();
      }

      // 4. Calculate progress and build tick summary
      const statsAfter = getStats(state.media);
      const newDone = statsAfter.done - doneBefore;
      const newReady = statsAfter.ready;
      const stillProcessing = statsAfter.processing;

      const parts: string[] = [];
      if (newDone > 0) parts.push(`${newDone} ad${newDone !== 1 ? 's' : ''} created`);
      if (newReady > 0) parts.push(`${newReady} ready`);
      if (stillProcessing > 0) parts.push(`${stillProcessing} processing`);
      if (statsAfter.failed > 0) parts.push(`${statsAfter.failed} failed`);
      state.tickSummary = parts.length > 0 ? parts.join(' · ') : 'Waiting...';

      emitProgress();

      // 5. Check if all items are finished
      if (statsAfter.done + statsAfter.failed === statsAfter.total) {
        state.phase = 'complete';
        emitProgress();
        break;
      }

      // 6. Track stale ticks (no new completions)
      if (newDone > 0) {
        staleTicks = 0;
      } else {
        staleTicks++;
        if (staleTicks >= options.maxStaleTicks) {
          break; // Will be caught by honest completion check below
        }
      }

      // 7. Wait before next tick
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

      // Honest completion check — only report complete if everything is actually done
      if (!state.isStopped && state.phase !== 'complete') {
        const finalStats = getStats(state.media);
        if (finalStats.done + finalStats.failed === finalStats.total) {
          state.phase = 'complete';
        } else {
          const pending = finalStats.total - finalStats.done - finalStats.failed;
          state.phase = 'error';
          state.error = `Launch timed out: ${finalStats.done}/${finalStats.total} ads created, ${pending} still processing on Facebook`;
        }
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
      if (m.state === 'failed') {
        m.retryCount = 0;
        m.error = null;
        // Reset state based on type and what's missing
        if (m.type === 'video' && !m.fbVideoId) {
          m.state = 'queued';
        } else if (m.type === 'video' && !m.thumbnailUrl) {
          m.state = 'processing';
        } else {
          m.state = 'ready';
        }
      }
    });
    emitProgress();
  }

  // ---------------------------------------------------------------------------
  // RETRY SINGLE ITEM
  // ---------------------------------------------------------------------------
  function retryItem(name: string): void {
    const item = state.media.find(m => m.name === name);
    if (!item) return;

    if (item.state === 'failed') {
      // RESET for a fresh attempt
      item.retryCount = 0; // Manual retry acts like a fresh start
      item.error = null;

      // Reset state based on type and what's missing
      if (item.type === 'video' && !item.fbVideoId) {
        item.state = 'queued';
      } else if (item.type === 'video' && !item.thumbnailUrl) {
        // Has ID but missing thumbnail -> needs processing poll
        item.state = 'processing';
      } else {
        // Image or Video with ID+Thumb -> needs ad creation
        item.state = 'ready';
      }

      // If launch stopped or completed, we might need to restart/resume?
      // For now, we assume the tick loop is still running or will be restarted.
      // If "complete" but we retry -> switch to "processing" phase conceptually?
      if (state.phase === 'complete' || state.phase === 'error') {
        // If we were "done", but now we have work, we are "running" again conceptually.
        // The tick loop might have exited. We might need a way to 'wake up' the runner if it stopped.
        // For this specific architecture, relying on external 'start()' call or existing loop.
        // Ideally the user clicks "Retry" and if the loop is dead, they might need to click "Launch" again?
        // OR we just update state and if the loop is running it picks it up.
        // If loop exited, we can't easily restart it without `start()`.
        // BUT, `retryFailed` is typically called when "error" or "stopped", so `start()` is likely next.
        // If we are "running", the loop picks it up.
      }
    }
    emitProgress();

    // If the runner has stopped (e.g. error or complete), restart it to process the retry
    if (!state.isRunning) {
      // Don't reset start time if we are just resuming/retrying
      // But start() resets it. Let's capture it or just let start() do its thing.
      // If we want to avoid resetting elapsed time, we might need a flag or modify start.
      // For now, simplicity: just restart. The user cares about the upload working.
      start().catch(err => {
        console.error('Retry restart failed:', err);
      });
    }
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
    retryItem,
    runPhase,
  };
}
