/**
 * Data abstraction layer for Ad Presets.
 *
 * This file is the ONLY place that knows about Airtable.
 * All Airtable field names are mapped here — nowhere else.
 *
 * IMPORTANT: Ad Presets are reusable copy & config presets, NOT Facebook entities.
 * They are filtered strictly by Product and selectable only during campaign launch.
 * No Facebook API calls are made from this feature.
 *
 * Rules:
 * - Read-only for now
 * - All mapping happens in mapAirtableToAdPreset
 * - No derived logic
 */

import type { AdPreset } from './types';
import { airtableFetch } from '../../core/data/airtable-client';

// =============================================================================
// TABLE & FIELD NAMES
// =============================================================================

const AD_PRESETS_TABLE = 'Ad Presets';
const PRODUCTS_TABLE = 'Products';

// Ad Presets table fields
const FIELD_PRESET_NAME = 'Preset Name';
const FIELD_PRODUCT = 'Product';

// Copy fields
const FIELD_PRIMARY_TEXT_1 = 'Primary Text 1';
const FIELD_PRIMARY_TEXT_2 = 'Primary Text 2';
const FIELD_PRIMARY_TEXT_3 = 'Primary Text 3';
const FIELD_PRIMARY_TEXT_4 = 'Primary Text 4';
const FIELD_PRIMARY_TEXT_5 = 'Primary Text 5';

const FIELD_HEADLINE_1 = 'Headline 1';
const FIELD_HEADLINE_2 = 'Headline 2';
const FIELD_HEADLINE_3 = 'Headline 3';
const FIELD_HEADLINE_4 = 'Headline 4';
const FIELD_HEADLINE_5 = 'Headline 5';

const FIELD_DESCRIPTION_1 = 'Description 1';
const FIELD_DESCRIPTION_2 = 'Description 2';
const FIELD_DESCRIPTION_3 = 'Description 3';
const FIELD_DESCRIPTION_4 = 'Description 4';
const FIELD_DESCRIPTION_5 = 'Description 5';

const FIELD_CALL_TO_ACTION = 'Call to Action';
const FIELD_BENEFICIARY_NAME = 'Beneficiary Name';
const FIELD_PAYER_NAME = 'Payer Name';

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

function mapAirtableToAdPreset(
  record: AirtableRecord,
  productsMap: Map<string, { id: string; name: string }>
): AdPreset | null {
  const fields = record.fields;

  // Required: Preset Name
  const name = typeof fields[FIELD_PRESET_NAME] === 'string'
    ? fields[FIELD_PRESET_NAME]
    : null;

  if (!name) {
    return null;
  }

  // Product (linked record) - REQUIRED for Ad Presets
  const productIds = fields[FIELD_PRODUCT] as string[] | undefined;
  const productId = productIds?.[0];
  const product = productId && productsMap.has(productId)
    ? productsMap.get(productId)!
    : { id: '', name: 'Unknown' };

  // Skip presets without a valid product
  if (!product.id) {
    return null;
  }

  // Helper to get string field
  const getString = (fieldName: string): string | undefined => {
    const value = fields[fieldName];
    return typeof value === 'string' ? value : undefined;
  };

  return {
    id: record.id,
    name,
    status: 'active' as const,
    product,

    // Primary texts
    primaryText1: getString(FIELD_PRIMARY_TEXT_1),
    primaryText2: getString(FIELD_PRIMARY_TEXT_2),
    primaryText3: getString(FIELD_PRIMARY_TEXT_3),
    primaryText4: getString(FIELD_PRIMARY_TEXT_4),
    primaryText5: getString(FIELD_PRIMARY_TEXT_5),

    // Headlines
    headline1: getString(FIELD_HEADLINE_1),
    headline2: getString(FIELD_HEADLINE_2),
    headline3: getString(FIELD_HEADLINE_3),
    headline4: getString(FIELD_HEADLINE_4),
    headline5: getString(FIELD_HEADLINE_5),

    // Descriptions
    description1: getString(FIELD_DESCRIPTION_1),
    description2: getString(FIELD_DESCRIPTION_2),
    description3: getString(FIELD_DESCRIPTION_3),
    description4: getString(FIELD_DESCRIPTION_4),
    description5: getString(FIELD_DESCRIPTION_5),

    // Call to action
    callToAction: getString(FIELD_CALL_TO_ACTION),

    // Compliance
    beneficiaryName: getString(FIELD_BENEFICIARY_NAME),
    payerName: getString(FIELD_PAYER_NAME),

    createdAt: record.createdTime,
  };
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * List all ad presets from Airtable.
 */
export async function listAdPresets(): Promise<AdPreset[]> {
  const productsMap = await fetchProducts();

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset ? `${AD_PRESETS_TABLE}?offset=${offset}` : AD_PRESETS_TABLE;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords
    .map((record) => mapAirtableToAdPreset(record, productsMap))
    .filter((p): p is AdPreset => p !== null);
}

/**
 * List ad presets by product ID.
 * Ad Presets are filtered strictly by Product.
 */
export async function listAdPresetsByProduct(productId: string): Promise<AdPreset[]> {
  const productsMap = await fetchProducts();

  const filterFormula = encodeURIComponent(
    `FIND("${productId}", ARRAYJOIN({${FIELD_PRODUCT}}))`
  );

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset
      ? `${AD_PRESETS_TABLE}?filterByFormula=${filterFormula}&offset=${offset}`
      : `${AD_PRESETS_TABLE}?filterByFormula=${filterFormula}`;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords
    .map((record) => mapAirtableToAdPreset(record, productsMap))
    .filter((p): p is AdPreset => p !== null);
}

/**
 * Get a single ad preset by ID.
 */
export async function getAdPreset(id: string): Promise<AdPreset | null> {
  const productsMap = await fetchProducts();

  try {
    const response = await airtableFetch(`${AD_PRESETS_TABLE}/${id}`);
    const record: AirtableRecord = await response.json();
    return mapAirtableToAdPreset(record, productsMap);
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
 * Payload for updating an ad preset.
 * Only editable fields are included.
 */
export interface AdPresetUpdatePayload {
  name?: string;
  primaryText1?: string;
  primaryText2?: string;
  primaryText3?: string;
  primaryText4?: string;
  primaryText5?: string;
  headline1?: string;
  headline2?: string;
  headline3?: string;
  headline4?: string;
  headline5?: string;
  description1?: string;
  description2?: string;
  description3?: string;
  description4?: string;
  description5?: string;
  callToAction?: string;
  beneficiaryName?: string;
  payerName?: string;
}

/**
 * Map domain payload to Airtable fields.
 */
function mapPayloadToAirtableFields(payload: AdPresetUpdatePayload): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (payload.name !== undefined) fields[FIELD_PRESET_NAME] = payload.name;
  if (payload.primaryText1 !== undefined) fields[FIELD_PRIMARY_TEXT_1] = payload.primaryText1;
  if (payload.primaryText2 !== undefined) fields[FIELD_PRIMARY_TEXT_2] = payload.primaryText2;
  if (payload.primaryText3 !== undefined) fields[FIELD_PRIMARY_TEXT_3] = payload.primaryText3;
  if (payload.primaryText4 !== undefined) fields[FIELD_PRIMARY_TEXT_4] = payload.primaryText4;
  if (payload.primaryText5 !== undefined) fields[FIELD_PRIMARY_TEXT_5] = payload.primaryText5;
  if (payload.headline1 !== undefined) fields[FIELD_HEADLINE_1] = payload.headline1;
  if (payload.headline2 !== undefined) fields[FIELD_HEADLINE_2] = payload.headline2;
  if (payload.headline3 !== undefined) fields[FIELD_HEADLINE_3] = payload.headline3;
  if (payload.headline4 !== undefined) fields[FIELD_HEADLINE_4] = payload.headline4;
  if (payload.headline5 !== undefined) fields[FIELD_HEADLINE_5] = payload.headline5;
  if (payload.description1 !== undefined) fields[FIELD_DESCRIPTION_1] = payload.description1;
  if (payload.description2 !== undefined) fields[FIELD_DESCRIPTION_2] = payload.description2;
  if (payload.description3 !== undefined) fields[FIELD_DESCRIPTION_3] = payload.description3;
  if (payload.description4 !== undefined) fields[FIELD_DESCRIPTION_4] = payload.description4;
  if (payload.description5 !== undefined) fields[FIELD_DESCRIPTION_5] = payload.description5;
  if (payload.callToAction !== undefined) fields[FIELD_CALL_TO_ACTION] = payload.callToAction;
  if (payload.beneficiaryName !== undefined) fields[FIELD_BENEFICIARY_NAME] = payload.beneficiaryName;
  if (payload.payerName !== undefined) fields[FIELD_PAYER_NAME] = payload.payerName;

  return fields;
}

/**
 * Update an ad preset.
 * Only patches the fields that are provided.
 */
export async function updateAdPreset(id: string, payload: AdPresetUpdatePayload): Promise<void> {
  const fields = mapPayloadToAirtableFields(payload);

  // Only make request if there are fields to update
  if (Object.keys(fields).length === 0) {
    return;
  }

  await airtableFetch(`${AD_PRESETS_TABLE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

/**
 * Create a new ad preset linked to a product.
 * Returns the created preset.
 */
export async function createAdPreset(
  productId: string,
  name: string,
  initialData?: AdPresetUpdatePayload
): Promise<AdPreset> {
  const productsMap = await fetchProducts();

  const fields: Record<string, unknown> = {
    [FIELD_PRESET_NAME]: name,
    [FIELD_PRODUCT]: [productId],
  };

  if (initialData) {
    const additionalFields = mapPayloadToAirtableFields(initialData);
    Object.assign(fields, additionalFields);
  }

  const response = await airtableFetch(AD_PRESETS_TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  const record: AirtableRecord = await response.json();
  const preset = mapAirtableToAdPreset(record, productsMap);

  if (!preset) {
    throw new Error('Failed to create ad preset: Invalid response from Airtable');
  }

  return preset;
}
