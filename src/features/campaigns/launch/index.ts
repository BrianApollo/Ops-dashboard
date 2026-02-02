/**
 * Campaign Launch Module
 *
 * Pipeline-based campaign launch system with:
 * - Batched media uploads
 * - Real-time progress tracking
 * - Automatic retry with fallback URLs
 * - Rate limiting awareness
 */

// Types
export * from './types';

// =============================================================================
// FB LAUNCH RUNNER (Pipeline-based launcher)
// =============================================================================

// React Hook
export { useFbLaunchRunner } from './hooks/useFbLaunchRunner';
export type { UseFbLaunchRunnerReturn } from './hooks/useFbLaunchRunner';

// Input Mapper
export { mapToFbLaunchInput } from './utils/mapToFbLaunchInput';
export type {
  MapperVideoInput,
  MapperImageInput,
  MapperDraftInput,
  MapperProfileInput,
  MapperAdPresetInput,
  MapToFbLaunchInputParams,
} from './utils/mapToFbLaunchInput';

// API Layer
export * as fbLaunchApi from './fbLaunchApi';

// Runner/Controller
export { createController, getStats } from './fbLaunchRunner';
export type {
  FbLaunchMediaInput,
  FbLaunchMediaState,
  FbLaunchOptions,
  FbLaunchInput,
  FbLaunchStats,
  FbLaunchState,
  FbLaunchController,
  OnProgressCallback,
  MediaType,
  MediaItemState,
  LaunchPhase,
} from './fbLaunchRunner';
