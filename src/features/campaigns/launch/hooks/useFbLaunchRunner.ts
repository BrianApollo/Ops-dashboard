/**
 * useFbLaunchRunner - React Hook for FB Launch Pipeline
 *
 * Wraps the fbLaunchRunner controller in React state management.
 * Provides a clean interface for React components to:
 * - Start/stop launches
 * - Track progress in real-time
 * - Retry failed items
 * - Reset for new launches
 */

import { useState, useCallback, useRef } from 'react';
import {
  createController,
  type FbLaunchInput,
  type FbLaunchState,
  type FbLaunchController,
  type FbLaunchStats,
  type LaunchPhase,
} from '../fbLaunchRunner';

// =============================================================================
// TYPES
// =============================================================================

export interface UseFbLaunchRunnerReturn {
  /** Whether a launch is currently in progress */
  isLaunching: boolean;

  /** Current launch state (null if no launch started) */
  state: FbLaunchState | null;

  /** Current phase of the launch */
  phase: LaunchPhase | null;

  /** Current stats (convenience accessor) */
  stats: FbLaunchStats | null;

  /** Campaign ID once created */
  campaignId: string | null;

  /** Ad Set ID once created */
  adsetId: string | null;

  /** Error message if launch failed */
  error: string | null;

  /** Start a new launch with the given input */
  launch: (input: FbLaunchInput) => Promise<FbLaunchState>;

  /** Stop the current launch */
  stop: () => void;

  /** Retry all failed media items */
  retryFailed: () => void;

  /** Retry a single media item by name */
  retryItem: (name: string) => void;

  /** Reset state for a new launch */
  reset: () => void;

  /** Get current state snapshot */
  getState: () => FbLaunchState | null;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: FbLaunchState = {
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
  media: [],
  stats: { queued: 0, uploading: 0, processing: 0, ready: 0, creatingAd: 0, done: 0, failed: 0, total: 0 },
  tickSummary: null,
};

// =============================================================================
// HOOK
// =============================================================================

export function useFbLaunchRunner(): UseFbLaunchRunnerReturn {
  // State
  const [state, setState] = useState<FbLaunchState | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controller ref (persists across renders)
  const controllerRef = useRef<FbLaunchController | null>(null);

  // ---------------------------------------------------------------------------
  // LAUNCH
  // ---------------------------------------------------------------------------
  const launch = useCallback(async (input: FbLaunchInput): Promise<FbLaunchState> => {
    // Reset state
    setError(null);
    setIsLaunching(true);
    setState({ ...initialState, media: [] });

    // Create controller with progress callback
    const controller = createController(input, (newState) => {
      setState({ ...newState });
    });
    controllerRef.current = controller;

    try {
      // Start the pipeline
      const finalState = await controller.start();
      setIsLaunching(false);
      return finalState;
    } catch (err) {
      const errorMessage = (err as Error).message || 'Launch failed';
      setError(errorMessage);
      setIsLaunching(false);
      throw err;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // STOP
  // ---------------------------------------------------------------------------
  const stop = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.stop();
      setIsLaunching(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // RETRY FAILED
  // ---------------------------------------------------------------------------
  const retryFailed = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.retryFailed();
    }
  }, []);

  const retryItem = useCallback((name: string) => {
    if (controllerRef.current) {
      controllerRef.current.retryItem(name);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // RESET
  // ---------------------------------------------------------------------------
  const reset = useCallback(() => {
    controllerRef.current = null;
    setState(null);
    setIsLaunching(false);
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // GET STATE
  // ---------------------------------------------------------------------------
  const getState = useCallback((): FbLaunchState | null => {
    if (controllerRef.current) {
      return controllerRef.current.getState();
    }
    return state;
  }, [state]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    isLaunching,
    state,
    phase: state?.phase ?? null,
    stats: state?.stats ?? null,
    campaignId: state?.campaignId ?? null,
    adsetId: state?.adsetId ?? null,
    error,
    launch,
    stop,
    retryFailed,
    retryItem,
    reset,
    getState,
  };
}

export default useFbLaunchRunner;
