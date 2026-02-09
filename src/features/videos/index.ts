// Components
export { VideoDetailPanel } from './VideoDetailPanel';
export { ScriptProductionGrid, buildGridCards, SLOT_DEFINITIONS } from './ScriptProductionGrid';
export type { GridCard, SlotState, SlotKey } from './ScriptProductionGrid';

// Reusable UI components
export { VideoNameCell, VideoTable, defaultVideoColumns, getColumnsWithoutProduct, getColumnsWithoutEditor } from './components';
export type { VideoTableColumn, VideoTableProps } from './components';

// Controller
export { useVideosController } from './useVideosController';
export type { UseVideosControllerResult } from './useVideosController';

// Types
export type {
  VideoAsset,
  VideoAsset as Video, // Alias for launch engine compatibility
  VideoStatus,
  VideoFormat,
  VideoFilters,
  VideoSavePayload,
  TextVersion,
} from './types';

// Status helpers
export {
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_THEME,
  FORMAT_LABELS,
  FORMAT_COLORS,
  TEXT_VERSION_COLORS,
  canApprove,
  canArchive,
  isReadOnly,
  canApproveAny,
  canApproveAll,
  getNextStatus,
  getEditorColor,
  getProductColor,
} from './status';

// Data layer (for direct access if needed)
export {
  listVideos,
  createVideo,
  createVideoBatch,
  updateVideo,
  updateVideoStatus,
  updateVideoUsage,
  deleteVideo,
  deleteVideos,
  getEditors,
  getProducts,
  getScripts,
  findVideoBySlot,
  updateVideoAfterUpload,
} from './data';
export type { SlotIdentifier, CreateVideoInput } from './data';

// Utilities
export { generateVideoName } from './generateVideoName';

// Drive upload (for direct access if needed)
export {
  uploadVideoWithFolder,
  isUploadInProgress,
  clearFolderCache,
  deleteDriveFile,
} from './drive';
export type {
  UploadResult,
  UploadProgress,
  VideoUploadOptions,
  VideoUploadResult,
} from './drive';

// Permissions
export {
  getVideoPermissions,
  canUploadToVideo,
  canEditVideo,
  getBulkPermissions,
  getCurrentUser,
} from './permissions';
export type {
  UserRole,
  UserContext,
  VideoPermissions,
  BulkPermissions,
} from './permissions';
