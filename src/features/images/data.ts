/**
 * Data abstraction layer for Images.
 *
 * This file is the ONLY place that knows about Airtable.
 * All Airtable field names are mapped here — nowhere else.
 *
 * Rules:
 * - Read-only for now
 * - All mapping happens in mapAirtableToImage
 * - No derived logic
 */

import type { Image, ImageStatus, ImageType } from './types';
import { airtableFetch } from '../../core/data/airtable-client';

// =============================================================================
// TABLE & FIELD NAMES
// =============================================================================

const IMAGES_TABLE = 'Images';
const TEMP_IMAGES_TABLE = 'Temp Images';
const PRODUCTS_TABLE = 'Products';

// Images table fields (must match actual Airtable column names)
const FIELD_NAME = 'Image Name';
const FIELD_STATUS = 'Status';
const FIELD_PRODUCT = 'Product';
const FIELD_IMAGE_TYPE = 'Type';
const FIELD_DRIVE_FILE_ID = 'Drive File ID';
const FIELD_DRIVE_LINK = 'Image Drive Link';
const FIELD_THUMBNAIL_URL = 'Thumbnail URL';
const FIELD_WIDTH = 'Width';
const FIELD_HEIGHT = 'Height';
const FIELD_FILE_SIZE = 'File Size';
const FIELD_NOTES = 'Notes';
const FIELD_USED_IN_CAMPAIGNS = 'Used In Campaigns';
const FIELD_COUNT = 'Count'; // Added field

// Products table fields
const FIELD_PRODUCT_NAME = 'Product Name';

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

function normalizeStatus(rawStatus: string | undefined): ImageStatus {
  if (!rawStatus) return 'pending';

  const statusMap: Record<string, ImageStatus> = {
    'pending': 'pending',
    'available': 'available',
    'ready': 'available',
    'active': 'available',
    'archived': 'archived',
    'deleted': 'archived',
  };

  const normalized = rawStatus.toLowerCase();
  return statusMap[normalized] ?? 'pending';
}

function normalizeImageType(rawType: string | undefined): ImageType | undefined {
  if (!rawType) return undefined;

  const typeMap: Record<string, ImageType> = {
    'thumbnail': 'thumbnail',
    'thumb': 'thumbnail',
    'banner': 'banner',
    'header': 'banner',
    'square': 'square',
    '1:1': 'square',
    'story': 'story',
    'stories': 'story',
    '9:16': 'story',
    'other': 'other',
  };

  const normalized = rawType.toLowerCase();
  return typeMap[normalized] ?? 'other';
}

// =============================================================================
// REFERENCE DATA CACHE
// =============================================================================

let productsCache: Map<string, { id: string; name: string }> | null = null;

async function fetchProducts(): Promise<Map<string, { id: string; name: string }>> {
  if (productsCache) {
    return productsCache;
  }

  const response = await airtableFetch(PRODUCTS_TABLE);
  const data: AirtableResponse = await response.json();

  const map = new Map<string, { id: string; name: string }>();

  for (const record of data.records) {
    const name = typeof record.fields[FIELD_PRODUCT_NAME] === 'string'
      ? record.fields[FIELD_PRODUCT_NAME]
      : 'Unknown';
    map.set(record.id, { id: record.id, name });
  }

  productsCache = map;
  return map;
}

// =============================================================================
// MAPPER
// =============================================================================

function mapAirtableToImage(
  record: AirtableRecord,
  productsMap: Map<string, { id: string; name: string }>
): Image | null {
  const fields = record.fields;

  // Required: Name
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

  // Product (linked record)
  const productIds = fields[FIELD_PRODUCT] as string[] | undefined;
  const productId = productIds?.[0];
  const product = productId && productsMap.has(productId)
    ? productsMap.get(productId)!
    : { id: 'unknown', name: 'Unknown Product' };

  // Image type
  const rawType = typeof fields[FIELD_IMAGE_TYPE] === 'string'
    ? fields[FIELD_IMAGE_TYPE]
    : undefined;
  const imageType = normalizeImageType(rawType);

  // Drive file ID
  const driveFileId = typeof fields[FIELD_DRIVE_FILE_ID] === 'string'
    ? fields[FIELD_DRIVE_FILE_ID]
    : undefined;

  // Drive Link (Google Drive URL)
  const driveLink = typeof fields[FIELD_DRIVE_LINK] === 'string'
    ? fields[FIELD_DRIVE_LINK]
    : undefined;

  // Thumbnail URL - use dedicated field, or derive from image link
  let thumbnailUrl = typeof fields[FIELD_THUMBNAIL_URL] === 'string'
    ? fields[FIELD_THUMBNAIL_URL]
    : undefined;

  // If no thumbnail but we have a link, derive thumbnail URL
  if (!thumbnailUrl && driveLink) {
    // Check if it's a legacy Drive URL
    const driveFileIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileIdMatch) {
      // Legacy Drive URL - use Drive thumbnail API
      thumbnailUrl = `https://drive.google.com/thumbnail?id=${driveFileIdMatch[1]}&sz=w400`;
    } else {
      // Cloudflare or direct URL - use directly as thumbnail
      thumbnailUrl = driveLink;
    }
  }

  // Dimensions
  const width = typeof fields[FIELD_WIDTH] === 'number'
    ? fields[FIELD_WIDTH]
    : undefined;

  const height = typeof fields[FIELD_HEIGHT] === 'number'
    ? fields[FIELD_HEIGHT]
    : undefined;

  // File size
  const fileSize = typeof fields[FIELD_FILE_SIZE] === 'number'
    ? fields[FIELD_FILE_SIZE]
    : undefined;

  // Notes
  const notes = typeof fields[FIELD_NOTES] === 'string'
    ? fields[FIELD_NOTES]
    : undefined;

  // Used In Campaigns (linked record IDs)
  const usedInCampaigns = Array.isArray(fields[FIELD_USED_IN_CAMPAIGNS])
    ? (fields[FIELD_USED_IN_CAMPAIGNS] as string[])
    : [];

  return {
    id: record.id,
    name,
    status,
    product,
    imageType,
    driveFileId,
    thumbnailUrl,
    width,
    height,
    fileSize,
    notes,
    usedInCampaigns,
    createdAt: record.createdTime,
    image_drive_link: driveLink,
    count: typeof fields[FIELD_COUNT] === 'number' ? fields[FIELD_COUNT] : undefined,
  };
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Map "Temp Images" record to Image domain model.
 * Handles different field names (e.g. "Name" vs "Image Name").
 */
function mapTempAirtableToImage(
  record: AirtableRecord,
  productsMap: Map<string, { id: string; name: string }>
): Image | null {
  const fields = record.fields;

  // Try multiple name fields
  const name = typeof fields['Name'] === 'string' ? fields['Name']
    : typeof fields[FIELD_NAME] === 'string' ? fields[FIELD_NAME]
      : null;

  if (!name) {
    console.warn('[mapTempAirtableToImage] Missing name for record:', record.id);
    return null;
  }

  // Status is always 'new'
  const status: ImageStatus = 'new';

  // Product
  const productIds = fields[FIELD_PRODUCT] as string[] | undefined;
  const productId = productIds?.[0];
  const product = productId && productsMap.has(productId)
    ? productsMap.get(productId)!
    : { id: 'unknown', name: 'Unknown Product' };

  // Drive Link
  const driveLink = typeof fields[FIELD_DRIVE_LINK] === 'string' ? fields[FIELD_DRIVE_LINK]
    : typeof fields['link'] === 'string' ? fields['link']
      : typeof fields['Link'] === 'string' ? fields['Link']
        : undefined;

  // Thumbnail - derive from link
  let thumbnailUrl = typeof fields[FIELD_THUMBNAIL_URL] === 'string' ? fields[FIELD_THUMBNAIL_URL] : undefined;
  if (!thumbnailUrl && driveLink) {
    // Check if it's a legacy Drive URL
    const driveFileIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileIdMatch) {
      // Legacy Drive URL - use Drive thumbnail API
      thumbnailUrl = `https://drive.google.com/thumbnail?id=${driveFileIdMatch[1]}&sz=w400`;
    } else {
      // Cloudflare or direct URL - use directly as thumbnail
      thumbnailUrl = driveLink;
    }
  }

  return {
    id: record.id,
    name,
    status,
    product,
    imageType: 'other', // Default to other
    driveFileId: undefined,
    thumbnailUrl,
    width: undefined,
    height: undefined,
    fileSize: undefined,
    notes: undefined,
    usedInCampaigns: [],
    createdAt: record.createdTime,
    image_drive_link: driveLink,
    image_url: driveLink,
  };
}

/**
 * List all images from Airtable (Images + Temp Images).
 */
export async function listImages(): Promise<Image[]> {
  const productsMap = await fetchProducts();

  // Helper to fetch all records from a table
  const fetchTable = async (tableName: string): Promise<AirtableRecord[]> => {
    const records: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      const url = offset ? `${tableName}?offset=${offset}` : tableName;
      const response = await airtableFetch(url);
      const data: AirtableResponse = await response.json();
      records.push(...data.records);
      offset = data.offset;
    } while (offset);
    return records;
  };

  const [imageRecords, tempImageRecords] = await Promise.all([
    fetchTable(IMAGES_TABLE),
    fetchTable(TEMP_IMAGES_TABLE).catch(err => {
      console.warn('Failed to fetch Temp Images:', err);
      return [] as AirtableRecord[];
    }),
  ]);

  const images = imageRecords
    .map((record) => mapAirtableToImage(record, productsMap))
    .filter((i): i is Image => i !== null);

  const tempImages = tempImageRecords
    .map((record) => mapTempAirtableToImage(record, productsMap))
    .filter((i): i is Image => i !== null);

  return [...images, ...tempImages];
}

/**
 * List images by product ID (Images + Temp Images).
 */
export async function listImagesByProduct(productId: string): Promise<Image[]> {
  const productsMap = await fetchProducts();

  const filterFormula = encodeURIComponent(
    `FIND("${productId}", ARRAYJOIN({${FIELD_PRODUCT}}))`
  );

  // Helper to fetch filtered records from a table
  const fetchFilteredTable = async (tableName: string): Promise<AirtableRecord[]> => {
    const records: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      const url = offset
        ? `${tableName}?filterByFormula=${filterFormula}&offset=${offset}`
        : `${tableName}?filterByFormula=${filterFormula}`;
      const response = await airtableFetch(url);
      const data: AirtableResponse = await response.json();
      records.push(...data.records);
      offset = data.offset;
    } while (offset);
    return records;
  };

  const [imageRecords, tempImageRecords] = await Promise.all([
    fetchFilteredTable(IMAGES_TABLE),
    fetchFilteredTable(TEMP_IMAGES_TABLE).catch(err => {
      console.warn('Failed to fetch Temp Images:', err);
      return [] as AirtableRecord[];
    }),
  ]);

  const images = imageRecords
    .map((record) => mapAirtableToImage(record, productsMap))
    .filter((i): i is Image => i !== null);

  const tempImages = tempImageRecords
    .map((record) => mapTempAirtableToImage(record, productsMap))
    .filter((i): i is Image => i !== null);

  return [...images, ...tempImages];
}

/**
 * Get a single image by ID.
 */
export async function getImage(id: string): Promise<Image | null> {
  const productsMap = await fetchProducts();

  try {
    const response = await airtableFetch(`${IMAGES_TABLE}/${id}`);
    const record: AirtableRecord = await response.json();
    return mapAirtableToImage(record, productsMap);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Clear products cache.
 */
export function clearProductsCache(): void {
  productsCache = null;
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Create a new image record in Airtable.
 *
 * @param productId - The product's Airtable record ID
 * @param name - The image name (e.g., "ProductName_ImageAd_001")
 * @param driveUrl - The Google Drive URL for the image
 * @returns The created Image record
 */
export async function createImage(
  productId: string,
  name: string,
  driveUrl: string,
  count?: number // Added count
): Promise<Image> {
  const productsMap = await fetchProducts();

  const fields: Record<string, unknown> = {
    [FIELD_NAME]: name,
    [FIELD_PRODUCT]: [productId],
    [FIELD_DRIVE_LINK]: driveUrl,
    [FIELD_COUNT]: count,
  };

  const response = await airtableFetch(IMAGES_TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  const record: AirtableRecord = await response.json();
  const image = mapAirtableToImage(record, productsMap);

  if (!image) {
    throw new Error('Failed to create image: Invalid response from Airtable');
  }

  return image;
}

/**
 * Delete a record from "Temp Images" table.
 */
export async function deleteTempImage(id: string): Promise<void> {
  await airtableFetch(`${TEMP_IMAGES_TABLE}/${id}`, {
    method: 'DELETE',
  });
}
