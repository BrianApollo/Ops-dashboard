/**
 * Cloudflare R2 Storage
 *
 * Re-exports storage functionality for use by feature modules.
 * Drop-in replacement for Google Drive storage.
 */

export {
  uploadFile,
  deleteFile,
  buildPublicUrl,
  type UploadProgress,
  type UploadResult,
  type UploadOptions,
} from './upload';

export {
  isCloudflareConfigured,
  validateConfig,
} from './config';
