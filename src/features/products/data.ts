/**
 * Data abstraction layer for Products.
 *
 * This file is the ONLY place that knows about Airtable.
 * All Airtable field names are mapped here — nowhere else.
 *
 * Rules:
 * - Read-only for now
 * - All mapping happens in mapAirtableToProduct
 * - No derived logic (counts injected by controller)
 */

import type { Product, ProductAsset, ProductStatus } from './types';
import { uploadProductAsset, deleteProductAssetFromDrive, createProductFolder, type UploadProgress } from './drive';
import { airtableFetch } from '../../core/data/airtable-client';

const GOOGLE_DRIVE_PRODUCTS_ROOT_ID = import.meta.env.VITE_GOOGLE_DRIVE_PRODUCTS_ROOT_ID;

// =============================================================================
// TABLE & FIELD NAMES
// =============================================================================

const PRODUCTS_TABLE = 'Products';

// Field names (exact Airtable names)
const FIELD_NAME = 'Product Name';
const FIELD_STATUS = 'Status';
const FIELD_DRIVE_FOLDER_ID = 'Drive Link';
const FIELD_PRODUCT_IMAGE = 'Product Images';
const FIELD_PRODUCT_LOGO = 'Product Logo';

// =============================================================================
// AIRTABLE TYPES
// =============================================================================

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

// =============================================================================
// STATUS NORMALIZATION
// =============================================================================

function normalizeStatus(rawStatus: string | undefined): ProductStatus {
  if (!rawStatus) return 'Active';

  const statusMap: Record<string, ProductStatus> = {
    'active': 'Active',
    'paused': 'Benched', // Map old "paused" to "Benched"
    'benched': 'Benched',
    'preparing': 'Preparing',
    'archived': 'Benched', // Map old "archived" to "Benched" if needed, or keep separate if type allows used, but type is strictly 3 values now.
    // Handle variations
    'live': 'Active',
    'inactive': 'Benched',
    'disabled': 'Benched',
  };

  const normalized = rawStatus.toLowerCase();
  return statusMap[normalized] ?? 'Active';
}

// =============================================================================
// AIRTABLE ATTACHMENT TYPES
// =============================================================================

interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size?: number;
  type?: string;
}

// =============================================================================
// MAPPER
// =============================================================================

/**
 * Parse Airtable attachments into ProductAsset array.
 */
function parseAttachments(attachments: unknown): ProductAsset[] {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((att): att is AirtableAttachment =>
      att && typeof att === 'object' && 'id' in att && 'url' in att && 'filename' in att
    )
    .map((att) => ({
      id: att.id,
      url: att.url,
      filename: att.filename,
      // driveFileId is not stored in Airtable attachments - we'll need to track separately
      driveFileId: undefined,
    }));
}

function mapAirtableToProduct(record: AirtableRecord): Product | null {
  const fields = record.fields;

  // Required: Product name
  const name = typeof fields[FIELD_NAME] === 'string'
    ? fields[FIELD_NAME]
    : null;

  if (!name) {
    return null;
  }

  // Status
  const rawStatus = typeof fields[FIELD_STATUS] === 'string'
    ? fields[FIELD_STATUS]
    : undefined;
  const status = normalizeStatus(rawStatus);

  // Drive Folder ID (extract from URL if needed)
  let driveFolderId: string | undefined;
  const driveLink = fields[FIELD_DRIVE_FOLDER_ID];
  if (typeof driveLink === 'string' && driveLink.trim()) {
    // Extract folder ID from URL if it's a full URL
    const folderIdMatch = driveLink.match(/folders\/([a-zA-Z0-9_-]+)/);
    driveFolderId = folderIdMatch ? folderIdMatch[1] : driveLink.trim();
  }

  // Product Images (Airtable attachments - array)
  const images = parseAttachments(fields[FIELD_PRODUCT_IMAGE]);

  // Product Logos (Airtable attachments - array)
  const logos = parseAttachments(fields[FIELD_PRODUCT_LOGO]);

  return {
    id: record.id,
    name,
    status,
    driveFolderId,
    images,
    logos,
    createdAt: record.createdTime,
  };
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * List all products from Airtable.
 */
export async function listProducts(): Promise<Product[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset ? `${PRODUCTS_TABLE}?offset=${offset}` : PRODUCTS_TABLE;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords
    .map(mapAirtableToProduct)
    .filter((p): p is Product => p !== null);
}

/**
 * Get a single product by ID.
 */
export async function getProduct(id: string): Promise<Product | null> {
  try {
    const response = await airtableFetch(`${PRODUCTS_TABLE}/${id}`);
    const record: AirtableRecord = await response.json();
    return mapAirtableToProduct(record);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Create a new product.
 */
export async function createProduct(
  name: string,
  status: ProductStatus = 'Preparing'
): Promise<Product> {
  // 1. Create Folder in Drive (if configured)
  let driveFolderUrl: string | undefined;

  if (GOOGLE_DRIVE_PRODUCTS_ROOT_ID) {
    try {
      const folderResult = await createProductFolder(name, GOOGLE_DRIVE_PRODUCTS_ROOT_ID);
      driveFolderUrl = folderResult.url;
      const productFolderId = folderResult.fileId;

      // Create Subfolders: Images, Scripts, Videos
      console.log(`[Data] Creating subfolders for product: ${name}`);
      await Promise.all([
        createProductFolder('Images', productFolderId),
        createProductFolder('Scripts', productFolderId),
        createProductFolder('Videos', productFolderId),
      ]);
    } catch (error) {
      console.error('Failed to create Drive folder for product:', error);
      // We continue even if folder creation fails, user can add it manually later
      // But typically this is critical enough to maybe throw?
      // For now, let's just log and continue, or maybe we SHOULD throw to let UI handle it.
      // Let's throw so the user knows something went wrong with the setup
      throw new Error(`Failed to create Google Drive folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    console.warn('VITE_GOOGLE_DRIVE_PRODUCTS_ROOT_ID not set. Skipping folder creation.');
  }

  // 2. Create Product in Airtable
  const fields: Record<string, unknown> = {
    [FIELD_NAME]: name,
    [FIELD_STATUS]: status,
  };

  if (driveFolderUrl) {
    fields[FIELD_DRIVE_FOLDER_ID] = driveFolderUrl;
  }

  const response = await airtableFetch(PRODUCTS_TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  const record: AirtableRecord = await response.json();
  const product = mapAirtableToProduct(record);

  if (!product) {
    throw new Error('Failed to map created product');
  }

  console.log(`[Data] Created product: ${product.name} (${product.id})`);
  return product;
}

// =============================================================================
// ASSET UPLOAD/DELETE OPERATIONS
// =============================================================================

export interface UploadAssetOptions {
  productId: string;
  productName: string;
  driveFolderId: string;
  file: File;
  assetType: 'image' | 'logo';
  existingCount: number;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadAssetResult {
  driveUrl: string;
  driveFileId: string;
}

/**
 * Upload a product asset to storage and add attachment to Airtable.
 *
 * Flow:
 * 1. Upload file to Cloudflare R2 storage
 * 2. Fetch current attachments from Airtable
 * 3. Add new attachment URL to existing attachments
 * 4. Update Airtable record
 */
export async function uploadAsset(options: UploadAssetOptions): Promise<UploadAssetResult> {
  const { productId, productName, file, assetType, existingCount, onProgress } = options;

  // Step 1: Upload to storage
  const assetNumber = existingCount + 1;
  const driveResult = await uploadProductAsset({
    productId,
    productName,
    file,
    assetType,
    assetNumber,
    onProgress,
  });

  // Step 2: Get current product record to preserve existing attachments
  const response = await airtableFetch(`${PRODUCTS_TABLE}/${productId}`);
  const record: AirtableRecord = await response.json();

  const fieldName = assetType === 'image' ? FIELD_PRODUCT_IMAGE : FIELD_PRODUCT_LOGO;
  const existingAttachments = Array.isArray(record.fields[fieldName])
    ? (record.fields[fieldName] as { url: string }[])
    : [];

  // Step 3: Add new attachment (Airtable accepts URLs for new attachments)
  const updatedAttachments = [
    ...existingAttachments.map((att) => ({ url: att.url })),
    { url: driveResult.url },
  ];

  // Step 4: Update Airtable record
  await airtableFetch(`${PRODUCTS_TABLE}/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        [fieldName]: updatedAttachments,
      },
    }),
  });

  console.log(`[Data] Uploaded ${assetType} for product ${productId}: ${driveResult.url}`);

  return {
    driveUrl: driveResult.url,
    driveFileId: driveResult.fileId,
  };
}

export interface DeleteAssetOptions {
  productId: string;
  assetId: string;
  driveFileId?: string;
  assetType: 'image' | 'logo';
}

/**
 * Delete a product asset from Google Drive and remove attachment from Airtable.
 *
 * Flow:
 * 1. Delete file from Google Drive (if driveFileId provided)
 * 2. Fetch current attachments from Airtable
 * 3. Filter out the deleted attachment
 * 4. Update Airtable record
 */
export async function deleteAsset(options: DeleteAssetOptions): Promise<void> {
  const { productId, assetId, driveFileId, assetType } = options;

  // Step 1: Delete from Google Drive (if we have the file ID)
  if (driveFileId) {
    await deleteProductAssetFromDrive(driveFileId);
  }

  // Step 2: Get current product record
  const response = await airtableFetch(`${PRODUCTS_TABLE}/${productId}`);
  const record: AirtableRecord = await response.json();

  const fieldName = assetType === 'image' ? FIELD_PRODUCT_IMAGE : FIELD_PRODUCT_LOGO;
  const existingAttachments = Array.isArray(record.fields[fieldName])
    ? (record.fields[fieldName] as { id: string; url: string }[])
    : [];

  // Step 3: Filter out the deleted attachment
  const updatedAttachments = existingAttachments
    .filter((att) => att.id !== assetId)
    .map((att) => ({ url: att.url }));

  // Step 4: Update Airtable record
  await airtableFetch(`${PRODUCTS_TABLE}/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        [fieldName]: updatedAttachments,
      },
    }),
  });

  console.log(`[Data] Deleted ${assetType} ${assetId} from product ${productId}`);
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

/**
 * Update a product's status.
 */
export async function updateProductStatus(
  productId: string,
  status: ProductStatus
): Promise<Product> {
  const response = await airtableFetch(`${PRODUCTS_TABLE}/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        [FIELD_STATUS]: status,
      },
    }),
  });

  const record: AirtableRecord = await response.json();
  const product = mapAirtableToProduct(record);

  if (!product) {
    throw new Error('Failed to map updated product');
  }

  console.log(`[Data] Updated product status: ${product.name} -> ${status}`);
  return product;
}
