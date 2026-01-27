/**
 * Product Asset upload module.
 *
 * Pure upload logic — no UI, no Airtable, no React.
 * Throws on failure; caller handles orchestration.
 *
 * Upload Strategy:
 * 1. Assets are uploaded to Cloudflare R2 with prefix "products/{productId}"
 * 2. File is renamed to: "{Product Name} - Product Image - {n}" or "{Product Name} - Product Logo - {n}"
 *
 * ABSOLUTE RULES:
 * - Airtable is the single source of truth
 * - productId determines storage path
 */

import {
  uploadFile,
  deleteFile,
  buildPublicUrl,
} from '../../core/storage/cloudflare';

// =============================================================================
// TYPES
// =============================================================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AssetUploadResult {
  url: string;
  fileId: string;
}

export interface ProductAssetUploadOptions {
  productId: string;
  productName: string;
  file: File;
  /** @deprecated No longer used with Cloudflare storage */
  productDriveFolderId?: string;
  assetType: 'image' | 'logo';
  assetNumber: number;
  onProgress?: (progress: UploadProgress) => void;
}

// =============================================================================
// MAIN PRODUCT ASSET UPLOAD FUNCTION
// =============================================================================

/**
 * Upload a product asset (image or logo) to Cloudflare R2 storage.
 *
 * Naming format:
 * - "{Product Name} - Product Image - 1"
 * - "{Product Name} - Product Logo - 2"
 *
 * @throws Error if productId is missing
 */
export async function uploadProductAsset(options: ProductAssetUploadOptions): Promise<AssetUploadResult> {
  const { productId, productName, file, assetType, assetNumber, onProgress } = options;

  if (!productId) {
    throw new Error('Upload blocked: Product ID is required.');
  }

  // Generate file name
  const assetLabel = assetType === 'image' ? 'Product Image' : 'Product Logo';
  const fileName = `${productName} - ${assetLabel} - ${assetNumber}`;

  console.log(`[Storage] Uploading product asset: ${fileName}`);
  console.log(`[Storage] Storage path: ${productId}/`);

  const result = await uploadFile(file, fileName, {
    prefix: productId,
    onProgress,
  });

  console.log(`[Storage] Upload complete: ${result.url}`);

  return {
    url: result.url,
    fileId: result.fileId,
  };
}

// =============================================================================
// FOLDER CREATION (NO-OP FOR CLOUDFLARE)
// =============================================================================

/**
 * @deprecated Cloudflare R2 doesn't use folders. This is a no-op for API compatibility.
 * Returns a mock result with the product prefix as the "folder" URL.
 */
export async function createProductFolder(
  folderName: string,
  _parentFolderId: string
): Promise<AssetUploadResult> {
  console.log(`[Storage] createProductFolder is a no-op with Cloudflare. Folder: ${folderName}`);

  // Return a mock result - Cloudflare uses prefixes, not folders
  const mockKey = `products/${folderName}`;
  return {
    url: buildPublicUrl(mockKey),
    fileId: mockKey,
  };
}

// =============================================================================
// FILE DELETION
// =============================================================================

/**
 * Delete a file from Cloudflare R2 storage by its key.
 *
 * @param fileKey - The R2 object key to delete
 * @throws Error if deletion fails (404 is silently ignored)
 */
export async function deleteProductAssetFromDrive(fileKey: string): Promise<void> {
  console.log(`[Storage] Deleting file: ${fileKey}`);
  await deleteFile(fileKey);
  console.log(`[Storage] File deleted: ${fileKey}`);
}
