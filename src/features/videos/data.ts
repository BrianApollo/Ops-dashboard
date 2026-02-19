/**
 * Data abstraction layer for Videos.
 *
 * This file is the ONLY place that knows about Airtable.
 * All Airtable field names are mapped here — nowhere else.
 *
 * Rules:
 * - Pure CRUD only (no business logic)
 * - All mapping happens in mapAirtableToVideoAsset
 * - No filtering, sorting, or domain rules
 */

import type { VideoAsset, VideoStatus, VideoFormat } from './types';
import { airtableFetch } from '../../core/data/airtable-client';

// Table names
const VIDEOS_TABLE = 'Videos';
const USERS_TABLE = 'Users';
const PRODUCTS_TABLE = 'Products';

// =============================================================================
// AIRTABLE FIELD MAPPINGS (Airtable names → Domain names)
// =============================================================================

// =============================================================================
// WRITABLE FIELDS (safe to write via API)
// =============================================================================
const FIELD_VIDEO_NAME = 'Video Name';
const FIELD_STATUS = 'Status';
const FIELD_FORMAT = 'Format';
const FIELD_TEXT_VERSION = 'Text Version'; // Single select: "Text" or "No Text"
const FIELD_EDITOR = 'Editor';             // Linked record → Users
const FIELD_PRODUCT = 'Product';           // Linked record → Products
const FIELD_SCRIPT = 'Script';             // Linked record → Video Scripts
const FIELD_CREATIVE_LINK = 'Creative Link';       // URL field for Drive link
export const FIELD_USED_IN_CAMPAIGN = 'Used In Campaign'; // Text/link field
const FIELD_NOTES = 'Notes';                       // Long text field
const FIELD_SCROLLSTOPPER_NUMBER = 'Scrollstopper Number'; // Number field for SS2, SS3, etc.

// =============================================================================
// READ-ONLY / COMPUTED FIELDS (NEVER write to these via API)
// These fields are auto-managed by Airtable and will cause 422 errors if written
// =============================================================================
const FIELD_VIDEO_UPLOAD = 'Video Upload';         // Attachment (read-only in our flow)
const FIELD_LAST_UPLOAD_AT = 'Last Upload At';     // Last modified time (computed)
const FIELD_SCRIPT_CONTENT = 'Script Content (from Script)'; // Lookup field (read-only)

// Users table fields
const FIELD_USER_NAME = 'Name';
const FIELD_USER_ROLE = 'Role';

// Products table fields
const FIELD_PRODUCT_NAME = 'Product Name';
const FIELD_PRODUCT_DRIVE_LINK = 'Drive Link'; // Google Drive folder URL/ID

// Video Scripts table fields
const FIELD_SCRIPT_NAME = 'Name';

// Table names
const VIDEO_SCRIPTS_TABLE = 'Video Scripts';

// =============================================================================
// AIRTABLE HELPERS
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
// MAPPER (single source of truth for Airtable → domain conversion)
// =============================================================================

/**
 * Normalizes Airtable status values to domain status.
 * Handles "To Do" (with space) → "todo" (no space).
 */
function normalizeStatus(rawStatus: string | undefined): VideoStatus {
  if (!rawStatus) return 'todo';

  // Map Airtable values to domain values
  const statusMap: Record<string, VideoStatus> = {
    'to do': 'todo',
    'todo': 'todo',
    'review': 'review',
    'available': 'available',
    'used': 'used',
  };

  const normalized = rawStatus.toLowerCase();
  return statusMap[normalized] ?? 'todo';
}

/**
 * Converts domain status to Airtable status value.
 * Handles "todo" → "To Do" (with space).
 */
function denormalizeStatus(status: VideoStatus): string {
  const statusMap: Record<VideoStatus, string> = {
    'todo': 'To Do',
    'review': 'Review',
    'available': 'Available',
    'used': 'Used',
  };
  return statusMap[status];
}

/**
 * Maps an Airtable record to VideoAsset.
 * Handles expanded linked records for Editor, Product, and Script.
 */
function mapAirtableToVideoAsset(
  record: AirtableRecord,
  editorsMap: Map<string, { id: string; name: string }>,
  productsMap: Map<string, { id: string; name: string; driveFolderId?: string }>,
  scriptsMap: Map<string, { id: string; name: string }>
): VideoAsset | null {
  const fields = record.fields;

  // Required fields - use Video Name field
  const name = typeof fields[FIELD_VIDEO_NAME] === 'string' ? fields[FIELD_VIDEO_NAME] : null;
  if (!name) {
    return null;
  }

  // Status with normalization (handles "To Do" → "todo")
  const rawStatus = typeof fields[FIELD_STATUS] === 'string' ? fields[FIELD_STATUS] : undefined;
  const status = normalizeStatus(rawStatus);

  // Format with fallback
  const validFormats: VideoFormat[] = ['square', 'vertical', 'youtube'];
  const rawFormat = (typeof fields[FIELD_FORMAT] === 'string'
    ? fields[FIELD_FORMAT].toLowerCase()
    : 'square') as VideoFormat;
  const format: VideoFormat = validFormats.includes(rawFormat) ? rawFormat : 'square';

  // hasText derived from Text Version field ("Text" → true, "No Text" → false)
  const textVersion = fields[FIELD_TEXT_VERSION];
  const hasText = textVersion === 'Text';

  // Editor from linked record
  const editorIds = fields[FIELD_EDITOR] as string[] | undefined;
  const editorId = editorIds?.[0];
  const editor = editorId && editorsMap.has(editorId)
    ? editorsMap.get(editorId)!
    : { id: 'unknown', name: 'Unknown Editor' };

  // Product from linked record (includes driveFolderId for upload targeting)
  const productIds = fields[FIELD_PRODUCT] as string[] | undefined;
  const productId = productIds?.[0];
  const productData = productId && productsMap.has(productId)
    ? productsMap.get(productId)!
    : { id: 'unknown', name: 'Unknown Product', driveFolderId: undefined };
  const product = {
    id: productData.id,
    name: productData.name,
    driveFolderId: productData.driveFolderId,
  };

  // Script from linked record
  const scriptIds = fields[FIELD_SCRIPT] as string[] | undefined;
  const scriptId = scriptIds?.[0];
  const script = scriptId && scriptsMap.has(scriptId)
    ? scriptsMap.get(scriptId)!
    : { id: 'unknown', name: 'Unknown Script' };

  // Created time - use record.createdTime as fallback
  const createdAt = record.createdTime;

  // Thumbnail - not available in current schema, use empty string
  const thumbnail = '';

  // Creative Link (storage URL - Cloudflare or legacy Drive)
  const creativeLink = typeof fields[FIELD_CREATIVE_LINK] === 'string'
    ? fields[FIELD_CREATIVE_LINK]
    : undefined;

  // Extract file ID from Creative Link URL if present
  // Handles both legacy Drive URLs and new Cloudflare URLs
  let driveFileId: string | undefined;
  if (creativeLink) {
    // Try legacy Drive URL pattern first
    const driveFileIdMatch = creativeLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileIdMatch) {
      driveFileId = driveFileIdMatch[1];
    } else {
      // For Cloudflare URLs, extract the path as the file key
      // e.g., https://pub-xxx.r2.dev/videos/productId/timestamp-filename.mp4
      try {
        const url = new URL(creativeLink);
        // Remove leading slash from pathname
        driveFileId = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
      } catch {
        // If URL parsing fails, use the full link as fallback
        driveFileId = creativeLink;
      }
    }
  }

  // Video Upload attachment (get URL from first attachment)
  const videoUploadField = fields[FIELD_VIDEO_UPLOAD];
  let videoUploadUrl: string | undefined;
  if (Array.isArray(videoUploadField) && videoUploadField.length > 0) {
    const firstAttachment = videoUploadField[0] as { url?: string };
    videoUploadUrl = firstAttachment?.url;
  }

  // Last Upload At
  const lastUploadAt = typeof fields[FIELD_LAST_UPLOAD_AT] === 'string'
    ? fields[FIELD_LAST_UPLOAD_AT]
    : undefined;

  // Notes
  const notes = typeof fields[FIELD_NOTES] === 'string'
    ? fields[FIELD_NOTES]
    : undefined;

  // Used In Campaign
  const usedInCampaign = typeof fields[FIELD_USED_IN_CAMPAIGN] === 'string'
    ? fields[FIELD_USED_IN_CAMPAIGN]
    : undefined;

  // Script Content (lookup field returns an array - extract first value)
  const scriptContentField = fields[FIELD_SCRIPT_CONTENT];
  const scriptContent = Array.isArray(scriptContentField) && scriptContentField.length > 0
    ? String(scriptContentField[0])
    : undefined;

  // Scrollstopper Number (undefined for original videos, 2+ for scrollstoppers)
  const scrollstopperNumber = typeof fields[FIELD_SCROLLSTOPPER_NUMBER] === 'number'
    ? fields[FIELD_SCROLLSTOPPER_NUMBER]
    : undefined;

  return {
    id: record.id,
    name,
    status,
    format,
    hasText,
    editor,
    product,
    script,
    createdAt,
    thumbnail,
    driveFileId,
    creativeLink,
    videoUploadUrl,
    lastUploadAt,
    scriptContent,
    notes,
    usedInCampaign,
    scrollstopperNumber,
    parentDriveLink: product.driveFolderId ? `https://drive.google.com/drive/folders/${product.driveFolderId}` : undefined,
  };
}

/**
 * Maps domain fields to Airtable field format for updates.
 * IMPORTANT: Only includes WRITABLE fields. Never add computed fields here.
 */
function mapDomainToAirtableFields(
  patch: Partial<Pick<VideoAsset, 'name' | 'status' | 'format' | 'hasText' | 'notes'>> & {
    editorId?: string;
    productId?: string;
    creativeLink?: string;
  }
): Record<string, unknown> {
  // Explicit whitelist of writable fields only
  const fields: Record<string, unknown> = {};

  if (patch.name !== undefined) {
    fields[FIELD_VIDEO_NAME] = patch.name;
  }
  if (patch.status !== undefined) {
    // Use denormalizeStatus to handle "todo" → "To Do"
    fields[FIELD_STATUS] = denormalizeStatus(patch.status);
  }
  if (patch.format !== undefined) {
    fields[FIELD_FORMAT] = patch.format === 'youtube' ? 'YouTube' : patch.format.charAt(0).toUpperCase() + patch.format.slice(1);
  }
  if (patch.hasText !== undefined) {
    // Map boolean to Text Version select value
    fields[FIELD_TEXT_VERSION] = patch.hasText ? 'Text' : 'No Text';
  }
  if (patch.editorId !== undefined) {
    fields[FIELD_EDITOR] = [patch.editorId]; // Linked records are arrays
  }
  if (patch.productId !== undefined) {
    fields[FIELD_PRODUCT] = [patch.productId]; // Linked records are arrays
  }
  if (patch.creativeLink !== undefined) {
    fields[FIELD_CREATIVE_LINK] = patch.creativeLink;
  }
  if (patch.notes !== undefined) {
    fields[FIELD_NOTES] = patch.notes;
  }
  // NOTE: lastUploadAt is a computed field (Last modified time) - NEVER write to it

  return fields;
}

// =============================================================================
// REFERENCE DATA FETCHERS
// =============================================================================

let editorsCache: { id: string; name: string }[] | null = null;
let productsCache: { id: string; name: string; driveFolderId?: string }[] | null = null;
let scriptsCache: { id: string; name: string }[] | null = null;

async function fetchEditors(): Promise<Map<string, { id: string; name: string }>> {
  const filterFormula = encodeURIComponent(`({${FIELD_USER_ROLE}} = 'Video Editor')`);
  const map = new Map<string, { id: string; name: string }>();
  const list: { id: string; name: string }[] = [];
  let offset: string | undefined;

  do {
    const url = offset
      ? `${USERS_TABLE}?filterByFormula=${filterFormula}&offset=${offset}`
      : `${USERS_TABLE}?filterByFormula=${filterFormula}`;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();

    for (const record of data.records) {
      const name = typeof record.fields[FIELD_USER_NAME] === 'string'
        ? record.fields[FIELD_USER_NAME]
        : 'Unknown';
      const editor = { id: record.id, name };
      map.set(record.id, editor);
      list.push(editor);
    }

    offset = data.offset;
  } while (offset);

  editorsCache = list;
  return map;
}

async function fetchProducts(): Promise<Map<string, { id: string; name: string; driveFolderId?: string }>> {
  const map = new Map<string, { id: string; name: string; driveFolderId?: string }>();
  const list: { id: string; name: string; driveFolderId?: string }[] = [];
  let offset: string | undefined;

  do {
    const url = offset
      ? `${PRODUCTS_TABLE}?offset=${offset}`
      : PRODUCTS_TABLE;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();

    for (const record of data.records) {
      const name = typeof record.fields[FIELD_PRODUCT_NAME] === 'string'
        ? record.fields[FIELD_PRODUCT_NAME]
        : 'Unknown';

      const driveLink = record.fields[FIELD_PRODUCT_DRIVE_LINK];
      let driveFolderId: string | undefined;
      if (typeof driveLink === 'string' && driveLink.trim()) {
        const folderIdMatch = driveLink.match(/folders\/([a-zA-Z0-9_-]+)/);
        driveFolderId = folderIdMatch ? folderIdMatch[1] : driveLink.trim();
      }

      const product = { id: record.id, name, driveFolderId };
      map.set(record.id, product);
      list.push(product);
    }

    offset = data.offset;
  } while (offset);

  productsCache = list;
  return map;
}

/**
 * Fetch Video Scripts for linked record resolution.
 */
async function fetchScripts(): Promise<Map<string, { id: string; name: string }>> {
  const map = new Map<string, { id: string; name: string }>();
  const list: { id: string; name: string }[] = [];
  let offset: string | undefined;

  do {
    const url = offset
      ? `${VIDEO_SCRIPTS_TABLE}?offset=${offset}`
      : VIDEO_SCRIPTS_TABLE;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();

    for (const record of data.records) {
      const name = typeof record.fields[FIELD_SCRIPT_NAME] === 'string'
        ? record.fields[FIELD_SCRIPT_NAME]
        : 'Unknown Script';
      const script = { id: record.id, name };
      map.set(record.id, script);
      list.push(script);
    }

    offset = data.offset;
  } while (offset);

  scriptsCache = list;
  return map;
}

// =============================================================================
// CRUD OPERATIONS (pure pass-through, no business logic)
// =============================================================================

/**
 * List all videos from Airtable.
 */
export async function listVideos(): Promise<VideoAsset[]> {
  // Fetch linked records first (editors, products, scripts)
  const [editorsMap, productsMap, scriptsMap] = await Promise.all([
    fetchEditors(),
    fetchProducts(),
    fetchScripts(),
  ]);

  // Fetch all video records (handle pagination)
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset ? `${VIDEOS_TABLE}?offset=${offset}` : VIDEOS_TABLE;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  // Map to domain model
  return allRecords
    .map((record) => mapAirtableToVideoAsset(record, editorsMap, productsMap, scriptsMap))
    .filter((v): v is VideoAsset => v !== null);
}

/**
 * Update a video by ID.
 * Only writes to WRITABLE fields - never to computed fields.
 */
export async function updateVideo(
  id: string,
  patch: Partial<Pick<VideoAsset, 'name' | 'status' | 'format' | 'hasText' | 'notes'>> & {
    editorId?: string;
    productId?: string;
    creativeLink?: string;
  }
): Promise<void> {
  const fields = mapDomainToAirtableFields(patch);

  await airtableFetch(`${VIDEOS_TABLE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

/**
 * Update status for multiple videos.
 */
export async function updateVideoStatus(ids: string[], status: VideoStatus): Promise<void> {
  // Airtable batch update limit is 10 records per request
  const batchSize = 10;
  const statusValue = denormalizeStatus(status);

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const records = batch.map((id) => ({
      id,
      fields: { [FIELD_STATUS]: statusValue },
    }));

    await airtableFetch(VIDEOS_TABLE, {
      method: 'PATCH',
      body: JSON.stringify({ records }),
    });
  }
}

/**
 * Batch update videos to mark them as Used and link to a campaign.
 * Handles chunking of 10 records per request.
 */
export async function updateVideoUsage(ids: string[], campaignId: string): Promise<void> {
  // Airtable batch update limit is 10 records per request
  const batchSize = 10;
  const statusValue = denormalizeStatus('used');

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const records = batch.map((id) => ({
      id,
      fields: {
        [FIELD_STATUS]: statusValue,
        [FIELD_USED_IN_CAMPAIGN]: [campaignId],
      },
    }));

    await airtableFetch(VIDEOS_TABLE, {
      method: 'PATCH',
      body: JSON.stringify({ records }),
    });
  }
}

/**
 * Batch update videos with arbitrary fields.
 * Handles chunking of 10 records per request.
 *
 * @param updates Array of objects containing id and fields to update
 */
export async function updateVideosBatch(
  updates: Array<{ id: string; fields: Record<string, unknown> }>
): Promise<void> {
  if (updates.length === 0) return;

  const BATCH_SIZE = 10;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    // Transform domain field names to Airtable field names if needed
    // For this specific use case, we expect the caller to pass correct mapped fields,
    // OR we can map them here. Given the specific requirement, let's map generic keys 
    // to our constants for safety if they match known keys.

    // However, to be flexible and match the "curl" example which passes specific structure,
    // we will assume the caller constructs the 'fields' object correctly using mapped names
    // or we provide a typed input.

    // Let's refine the input to strict types or map it.
    // The user wants to update 'Used In Campaign' and 'Status'.
    // We already have constants: FIELD_USED_IN_CAMPAIGN, FIELD_STATUS.

    // Let's map the batch properly for the API call.
    const records = batch.map(u => ({
      id: u.id,
      fields: u.fields
    }));

    await airtableFetch(VIDEOS_TABLE, {
      method: 'PATCH',
      body: JSON.stringify({ records }),
    });
  }
}

/**
 * Delete a video by ID.
 */
export async function deleteVideo(id: string): Promise<void> {
  await airtableFetch(`${VIDEOS_TABLE}/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Delete multiple videos.
 */
export async function deleteVideos(ids: string[]): Promise<void> {
  // Airtable batch delete limit is 10 records per request
  const batchSize = 10;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const params = batch.map((id) => `records[]=${id}`).join('&');

    await airtableFetch(`${VIDEOS_TABLE}?${params}`, {
      method: 'DELETE',
    });
  }
}

/**
 * Create a new video record in Airtable.
 * CRUD only - no business logic.
 */
export async function createVideo(
  name: string,
  format: VideoFormat,
  hasText: boolean,
  editorId: string,
  productId: string,
  scriptId: string,
  scrollstopperNumber?: number
): Promise<VideoAsset> {
  // Build fields object with Airtable field names
  const fields: Record<string, unknown> = {
    [FIELD_VIDEO_NAME]: name,
    [FIELD_STATUS]: 'To Do',
    [FIELD_FORMAT]: format === 'youtube' ? 'YouTube' : format.charAt(0).toUpperCase() + format.slice(1),
    [FIELD_TEXT_VERSION]: hasText ? 'Text' : 'No Text',
    [FIELD_EDITOR]: [editorId],
    [FIELD_PRODUCT]: [productId],
    [FIELD_SCRIPT]: [scriptId],
  };

  // Only set scrollstopper number if provided (leave empty for original videos)
  if (scrollstopperNumber !== undefined) {
    fields[FIELD_SCROLLSTOPPER_NUMBER] = scrollstopperNumber;
  }

  const response = await airtableFetch(VIDEOS_TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  const record: AirtableRecord = await response.json();

  // Fetch reference data for mapping
  const [editorsMap, productsMap, scriptsMap] = await Promise.all([
    fetchEditors(),
    fetchProducts(),
    fetchScripts(),
  ]);

  const video = mapAirtableToVideoAsset(record, editorsMap, productsMap, scriptsMap);

  if (!video) {
    throw new Error('Failed to create video: Invalid response from Airtable');
  }

  return video;
}

/**
 * Batch create video records in Airtable.
 * CRUD only - no business logic.
 * Airtable limits to 10 records per request.
 */
export interface CreateVideoInput {
  name: string;
  format: VideoFormat;
  hasText: boolean;
  editorId: string;
  productId: string;
  scriptId: string;
  scrollstopperNumber?: number;
}

export async function createVideoBatch(videos: CreateVideoInput[]): Promise<VideoAsset[]> {
  if (videos.length === 0) return [];

  // Build records array for Airtable
  const records = videos.map((v) => {
    const fields: Record<string, unknown> = {
      [FIELD_VIDEO_NAME]: v.name,
      [FIELD_STATUS]: 'To Do',
      [FIELD_FORMAT]: v.format === 'youtube' ? 'YouTube' : v.format.charAt(0).toUpperCase() + v.format.slice(1),
      [FIELD_TEXT_VERSION]: v.hasText ? 'Text' : 'No Text',
      [FIELD_EDITOR]: [v.editorId],
      [FIELD_PRODUCT]: [v.productId],
      [FIELD_SCRIPT]: [v.scriptId],
    };

    // Only set scrollstopper number if provided (leave empty for original videos)
    if (v.scrollstopperNumber !== undefined) {
      fields[FIELD_SCROLLSTOPPER_NUMBER] = v.scrollstopperNumber;
    }

    return { fields };
  });

  // Chunk into batches of 10 (Airtable limit)
  const BATCH_SIZE = 10;
  const batches: typeof records[] = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE));
  }

  // Execute batches
  const allCreatedRecords: AirtableRecord[] = [];
  for (const batch of batches) {
    const response = await airtableFetch(VIDEOS_TABLE, {
      method: 'POST',
      body: JSON.stringify({ records: batch }),
    });
    const data: AirtableResponse = await response.json();
    allCreatedRecords.push(...data.records);
  }

  // Fetch reference data once for mapping
  const [editorsMap, productsMap, scriptsMap] = await Promise.all([
    fetchEditors(),
    fetchProducts(),
    fetchScripts(),
  ]);

  // Map all records to VideoAsset
  const createdVideos = allCreatedRecords
    .map((record) => mapAirtableToVideoAsset(record, editorsMap, productsMap, scriptsMap))
    .filter((v): v is VideoAsset => v !== null);

  return createdVideos;
}

// =============================================================================
// REFERENCE DATA (for dropdowns)
// =============================================================================

/**
 * Get available editors for dropdown.
 */
export async function getEditors(): Promise<{ id: string; name: string }[]> {
  if (editorsCache) {
    return editorsCache;
  }
  await fetchEditors();
  return editorsCache || [];
}

/**
 * Get available products for dropdown.
 * Includes driveFolderId for upload folder targeting.
 */
export async function getProducts(): Promise<{ id: string; name: string; driveFolderId?: string }[]> {
  if (productsCache) {
    return productsCache;
  }
  await fetchProducts();
  return productsCache || [];
}

/**
 * Get available scripts for dropdown.
 */
export async function getScripts(): Promise<{ id: string; name: string }[]> {
  if (scriptsCache) {
    return scriptsCache;
  }
  await fetchScripts();
  return scriptsCache || [];
}

// =============================================================================
// SLOT-BASED OPERATIONS (for upload flow)
// =============================================================================

export interface SlotIdentifier {
  scriptId: string;
  editorId: string;
  format: VideoFormat;
  hasText: boolean;
}

/**
 * Find a video by its slot (Script × Editor × Format × HasText).
 * Returns null if no video exists in that slot.
 *
 * This is used to:
 * 1. Check for duplicates before upload
 * 2. Find the existing video for replacement
 */
export async function findVideoBySlot(
  slot: SlotIdentifier,
  videos: VideoAsset[]
): Promise<VideoAsset | null> {
  // Filter in-memory since we already have all videos loaded
  const match = videos.find(
    (v) =>
      v.script.id === slot.scriptId &&
      v.editor.id === slot.editorId &&
      v.format === slot.format &&
      v.hasText === slot.hasText
  );

  return match || null;
}

/**
 * Update a video record after successful Drive upload.
 * Sets Creative Link field and updates status.
 * NOTE: Last Upload At is a computed field (Last modified time) and auto-updates.
 *
 * @param videoId - The Airtable record ID
 * @param creativeLink - The Google Drive shareable link (Creative Link field)
 * @param newStatus - The new status (typically 'review' after upload)
 */
export async function updateVideoAfterUpload(
  videoId: string,
  creativeLink: string,
  newStatus: VideoStatus
): Promise<void> {
  // Only write to writable fields - lastUploadAt is computed and auto-updates
  await updateVideo(videoId, {
    creativeLink,
    status: newStatus,
  });
}

