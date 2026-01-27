/**
 * Cloudflare R2 Storage Upload Utilities
 *
 * All uploads use presigned URLs for reliability.
 * Browser uploads directly to R2 - worker only handles metadata operations.
 *
 * Architecture:
 * - /presign: Generate signed upload URL
 * - /delete: Delete object by key
 * - Browser PUT directly to R2 with presigned URL
 */

import { CF_STORAGE_WORKER_URL, CF_R2_PUBLIC_URL, validateConfig } from './config';

// =============================================================================
// TYPES
// =============================================================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  fileId: string; // R2 object key
}

export interface UploadOptions {
  /** Optional subfolder/prefix for the file (e.g., "videos", "images") */
  prefix?: string;
  /** Optional progress callback */
  onProgress?: (progress: UploadProgress) => void;
}

// =============================================================================
// WORKER RESPONSE TYPES
// =============================================================================

interface WorkerDeleteResponse {
  success: boolean;
  error?: string;
}

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresAt: string;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Build a public URL for an R2 object.
 *
 * @param key - The R2 object key (file path)
 * @returns Full public URL
 */
export function buildPublicUrl(key: string): string {
  validateConfig();

  // Ensure no double slashes
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  const baseUrl = CF_R2_PUBLIC_URL!.endsWith('/')
    ? CF_R2_PUBLIC_URL!.slice(0, -1)
    : CF_R2_PUBLIC_URL!;

  return `${baseUrl}/${cleanKey}`;
}

/**
 * Upload a file to Cloudflare R2 storage.
 *
 * Uses presigned URL flow for all uploads:
 * 1. Request presigned URL from worker
 * 2. Browser uploads directly to R2
 * 3. R2 success = file exists (no silent failures)
 *
 * @param file - The file to upload
 * @param fileName - The name to use for the file
 * @param options - Upload options (prefix, onProgress)
 * @returns Upload result with URL and file ID (key)
 */
export async function uploadFile(
  file: File,
  fileName: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  validateConfig();

  const { prefix, onProgress } = options;

  // Validate fileName parameter is provided
  if (!fileName || fileName.trim() === '') {
    throw new Error('Upload blocked: fileName parameter is required');
  }

  // Construct key using the provided fileName (NOT file.name)
  const key = prefix
    ? `${prefix}/${fileName}`
    : fileName;

  console.log(`[CF Storage] Uploading file as: ${key} (size: ${file.size} bytes)`);

  return uploadWithPresignedUrl(file, key, onProgress);
}

/**
 * Upload a file using a presigned URL.
 * Browser uploads directly to R2 for maximum reliability.
 */
async function uploadWithPresignedUrl(
  file: File,
  key: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const contentType = file.type || 'application/octet-stream';

  // Step 1: Get presigned URL from worker
  const presignResponse = await fetch(`${CF_STORAGE_WORKER_URL}/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      contentType,
      contentLength: file.size,
    }),
  });

  if (!presignResponse.ok) {
    let errorMessage = `Failed to get presigned URL: ${presignResponse.status}`;
    try {
      const errorData = await presignResponse.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  const presignData: PresignResponse = await presignResponse.json();
  console.log(`[CF Storage] Got presigned URL, uploading directly to R2...`);

  // Step 2: Upload file directly to R2 using presigned URL
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Presigned upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during presigned upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Presigned upload was aborted'));
    });

    xhr.open('PUT', presignData.uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });

  console.log(`[CF Storage] Presigned upload complete: ${presignData.publicUrl}`);

  return {
    url: presignData.publicUrl,
    fileId: key,
  };
}

/**
 * Delete a file from Cloudflare R2 storage.
 *
 * @param key - The R2 object key to delete
 * @throws Error if deletion fails (404 is silently ignored - file may already be deleted)
 */
export async function deleteFile(key: string): Promise<void> {
  validateConfig();

  console.log(`[CF Storage] Deleting file: ${key}`);

  const response = await fetch(`${CF_STORAGE_WORKER_URL}/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key }),
  });

  // 404 is acceptable (file already deleted)
  if (response.status === 404) {
    console.log(`[CF Storage] File already deleted: ${key}`);
    return;
  }

  if (!response.ok) {
    let errorMessage = `Failed to delete file: ${response.status}`;
    try {
      const errorData: WorkerDeleteResponse = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  console.log(`[CF Storage] File deleted: ${key}`);
}
