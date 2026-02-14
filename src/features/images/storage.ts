/**
 * Image Storage Upload Helper
 *
 * Canonical image upload pipeline for Cloudflare R2 storage.
 * Used by both direct uploads and approve/migrate flows.
 *
 * INVARIANTS:
 * 1. Final filename = {ProductName}_ImageAd_{NNN}.{extension}
 * 2. Storage path = /{ProductName}/Images/{FinalFilename}
 * 3. Extension extracted from File.name or MIME type
 * 4. URL only from uploadFile() return value
 */

import {
  uploadFile,
  type UploadProgress,
} from '../../core/storage/cloudflare';

// =============================================================================
// TYPES
// =============================================================================

export interface ImageUploadOptions {
  /** Product name (NOT Airtable record ID) */
  productName: string;
  /** The sequential image number (1, 2, 3...) */
  imageNumber: number;
  /** The image data (File from picker or Blob from fetch) */
  source: File | Blob;
  /** MIME type (required when source is Blob) */
  mimeType?: string;
  /** Optional progress callback */
  onProgress?: (progress: UploadProgress) => void;
}

export interface ImageUploadResult {
  url: string;
  key: string;
  finalFilename: string;
}

// =============================================================================
// HELPER
// =============================================================================

/**
 * Upload an image to Cloudflare R2 storage.
 *
 * @throws Error if productName is an Airtable record ID
 * @throws Error if extension cannot be determined
 * @throws Error if upload fails
 */
export async function uploadImageToStorage(
  options: ImageUploadOptions
): Promise<ImageUploadResult> {
  const { productName, imageNumber, source, mimeType, onProgress } = options;

  // ==========================================================================
  // VALIDATION: Product name must NOT be an Airtable record ID
  // ==========================================================================
  if (!productName) {
    throw new Error('Upload blocked: Product name is required.');
  }

  if (productName.startsWith('rec')) {
    throw new Error(
      `Invariant violation: Airtable record ID used as storage key. Got: "${productName}".`
    );
  }

  // ==========================================================================
  // EXTRACT EXTENSION
  // ==========================================================================
  let extension: string;

  if (source instanceof File && source.name) {
    // Flow A: Extract from filename
    const parts = source.name.split('.');
    if (parts.length < 2) {
      throw new Error(`Upload blocked: File "${source.name}" has no extension.`);
    }
    extension = parts.pop()!.toLowerCase();
    if (!extension) {
      throw new Error(`Upload blocked: Could not extract extension from "${source.name}".`);
    }
  } else if (mimeType) {
    // Flow B: Extract from MIME type
    const mimeExt = mimeType.split('/')[1];
    extension = mimeExt || 'jpg';
  } else {
    throw new Error('Upload blocked: Cannot determine file extension (no filename or MIME type).');
  }

  // ==========================================================================
  // CONSTRUCT CANONICAL FILENAME
  // ==========================================================================
  const paddedNumber = String(imageNumber).padStart(3, '0');
  const finalFilename = `${productName}_ImageAd_${paddedNumber}.${extension}`;

  console.log(`[Storage] Uploading image: ${finalFilename}`);
  console.log(`[Storage] Storage path: ${productName}/Images/${finalFilename}`);

  // ==========================================================================
  // UPLOAD TO CLOUDFLARE
  // ==========================================================================
  const file = source instanceof File
    ? source
    : new File([source], finalFilename, { type: mimeType || 'application/octet-stream' });

  const result = await uploadFile(file, finalFilename, {
    prefix: `${productName}/Images`,
    onProgress,
  });

  // ==========================================================================
  // VALIDATE RESULT
  // ==========================================================================
  if (!result.url) {
    throw new Error('Upload failed: No URL returned from storage worker');
  }

  if (!result.fileId) {
    throw new Error('Upload failed: No file key returned from storage worker');
  }

  if (!result.url.includes(import.meta.env.VITE_CF_R2_DOMAIN)) {
    throw new Error(
      `Upload failed: Invalid URL domain. Expected ${import.meta.env.VITE_CF_R2_DOMAIN}, got: ${result.url}`
    );
  }

  console.log(`[Storage] Upload complete. URL: ${result.url}`);

  return {
    url: result.url,
    key: result.fileId,
    finalFilename,
  };
}
