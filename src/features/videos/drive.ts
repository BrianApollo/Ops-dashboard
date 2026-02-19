/**
 * Video upload module.
 *
 * Video-specific orchestration using Cloudflare R2 storage.
 * Throws on failure; caller handles orchestration.
 *
 * Upload Strategy:
 * 1. Files are uploaded to Cloudflare R2 with "{productId}/Videos" prefix
 * 2. File is named using the Airtable record name
 *
 * INVARIANTS (enforced at runtime):
 * 1. A video URL may ONLY come from uploadFile() return value
 * 2. No URL generation via string concatenation or buildPublicUrl()
 * 3. If uploadFile() fails, no URL is returned and no Airtable write occurs
 * 4. URL must be from trustapollo.media domain
 *
 * ABSOLUTE RULES:
 * - Filename parsing is FORBIDDEN
 * - Cloudflare storage is the single source of truth for URLs
 */

import {
  uploadFile,
  deleteFile,
  type UploadProgress,
  type UploadResult,
} from '../../core/storage/cloudflare';

// =============================================================================
// RE-EXPORTS (for backwards compatibility)
// =============================================================================

/** @deprecated Use deleteFile from core/storage/cloudflare */
export const deleteDriveFile = deleteFile;
/** @deprecated No longer needed with Cloudflare storage */
export function clearFolderCache(): void {
  // No-op: Cloudflare doesn't use folder caching
}
export type { UploadProgress, UploadResult };

// =============================================================================
// CONFIGURATION
// =============================================================================

// Videos subfolder name (constant)
const VIDEOS_FOLDER_NAME = 'Videos';

// =============================================================================
// TYPES
// =============================================================================

export interface VideoUploadOptions {
  videoId: string;
  /** The video name from Airtable - used as the file name */
  videoName: string;
  file: File;
  /** The product slug/name (used as prefix for storage path). MUST NOT be an Airtable record ID. */
  productStorageKey: string;
  /** @deprecated No longer used with Cloudflare storage */
  productDriveFolderId?: string;
  onProgress?: (progress: UploadProgress) => void;
}

export interface VideoUploadResult {
  url: string;
  fileId: string;
  /** @deprecated Always empty with Cloudflare storage */
  folderId: string;
}

// =============================================================================
// UPLOAD LOCK (prevent duplicate uploads per slot)
// =============================================================================

/**
 * Track in-flight uploads to prevent duplicates.
 * Key format: "{videoId}"
 */
const uploadLocks = new Set<string>();

/**
 * Check if an upload is already in progress for this video.
 */
export function isUploadInProgress(videoId: string): boolean {
  return uploadLocks.has(videoId);
}

// =============================================================================
// MAIN VIDEO UPLOAD FUNCTION
// =============================================================================

/**
 * Upload a video file to Cloudflare R2 storage.
 *
 * ALGORITHM:
 * 1. Validate productId exists
 * 2. Upload file to R2 with prefix "videos/{productId}"
 * 3. File is named using videoName (Airtable record name)
 *
 * RULES:
 * - Filename content has ZERO effect on behavior
 * - productId determines storage path prefix
 *
 * @throws Error if productId is missing
 * @throws Error if upload is already in progress
 * @throws Error if upload fails
 */
export async function uploadVideoWithFolder(options: VideoUploadOptions): Promise<VideoUploadResult> {
  const { videoId, videoName, file, productStorageKey, onProgress } = options;

  // ==========================================================================
  // VALIDATION: Product storage key is REQUIRED
  // ==========================================================================
  if (!productStorageKey) {
    throw new Error(
      'Upload blocked: Product storage key is required for video upload.'
    );
  }

  // ==========================================================================
  // INVARIANT: Storage key must NOT be an Airtable record ID
  // ==========================================================================
  if (productStorageKey.startsWith('rec')) {
    throw new Error(
      `Invariant violation: Airtable record ID used as storage key. Got: "${productStorageKey}". Use product.name instead.`
    );
  }

  // Prevent duplicate uploads
  if (uploadLocks.has(videoId)) {
    throw new Error('Upload already in progress for this video');
  }

  uploadLocks.add(videoId);

  try {
    // ==========================================================================
    // VALIDATION: Airtable video name is REQUIRED
    // ==========================================================================
    if (!videoName || videoName.trim() === '') {
      throw new Error('Upload blocked: Airtable video name is required.');
    }

    // ==========================================================================
    // Extract extension from local file (ONLY use of file.name)
    // ==========================================================================
    const fileParts = file.name.split('.');
    if (fileParts.length < 2) {
      throw new Error(`Upload blocked: File "${file.name}" has no extension.`);
    }
    const extension = fileParts.pop()!.toLowerCase();
    if (!extension) {
      throw new Error(`Upload blocked: Could not extract extension from "${file.name}".`);
    }

    // ==========================================================================
    // Construct canonical filename: {AirtableVideoName}.{extension}
    // ==========================================================================
    const finalFilename = `${videoName}.${extension}`;

    console.log(`[Storage] Uploading video: ${finalFilename}`);
    console.log(`[Storage] Storage path: ${productStorageKey}/Videos/${finalFilename}`);

    // INVARIANT: uploadFile() is the ONLY source of truth for URLs
    // If this call fails, no URL is generated and no Airtable write occurs
    const result = await uploadFile(
      file,
      finalFilename, // Canonical filename from Airtable + extension
      {
        prefix: `${productStorageKey}/Videos`,
        onProgress,
      }
    );

    // ==========================================================================
    // INVARIANT CHECKS: URL must exist and be valid
    // ==========================================================================
    if (!result.url) {
      throw new Error('Upload failed: No URL returned from storage worker');
    }

    if (!result.fileId) {
      throw new Error('Upload failed: No file key returned from storage worker');
    }

    // Validate URL is from the correct domain (trustapollo.media)
    if (!result.url.includes(import.meta.env.VITE_CF_R2_DOMAIN)) {
      throw new Error(
        `Upload failed: Invalid URL domain. Expected ${import.meta.env.VITE_CF_R2_DOMAIN}, got: ${result.url}`
      );
    }

    console.log(`[Storage] Upload complete. URL: ${result.url}`);

    return {
      url: result.url,
      fileId: result.fileId,
      folderId: '', // Deprecated: not used with Cloudflare
    };
  } finally {
    // Always release the lock
    uploadLocks.delete(videoId);
  }
}
