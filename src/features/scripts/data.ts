/**
 * Data abstraction layer for Scripts.
 *
 * This file is the ONLY place that knows about Airtable.
 * All Airtable field names are mapped here — nowhere else.
 *
 * Rules:
 * - Read-only for now
 * - All mapping happens in mapAirtableToScript
 * - No derived logic
 */

import type { Script, ScriptStatus } from './types';
import { airtableFetch } from '../../core/data/airtable-client';

// =============================================================================
// TABLE & FIELD NAMES
// =============================================================================

const SCRIPTS_TABLE = 'Video Scripts';
const PRODUCTS_TABLE = 'Products';
const USERS_TABLE = 'Users';

// Scripts table fields
const FIELD_NAME = 'Name';
const FIELD_PRODUCT = 'Product';
const FIELD_AUTHOR = 'Author';
const FIELD_CONTENT = 'Script Content';
const FIELD_IS_APPROVED = 'Approved';
const FIELD_NEEDS_REVISION = 'Revision Needed';
const FIELD_VERSION = 'Version';
const FIELD_NOTES = 'Notes';

// Hook-related fields
const FIELD_HOOK = 'Hook';
const FIELD_BODY = 'Body';
const FIELD_HOOK_NUMBER = 'Hook Number';
const FIELD_BASE_SCRIPT_NUMBER = 'Base Script Number';

// Products table fields
const FIELD_PRODUCT_NAME = 'Product Name';

// Users table fields
const FIELD_USER_NAME = 'Name';

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
let usersCache: Map<string, { id: string; name: string; role: string }> | null = null;

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

async function fetchUsers(): Promise<Map<string, { id: string; name: string; role: string }>> {
  if (usersCache) {
    return usersCache;
  }

  const response = await airtableFetch(USERS_TABLE);
  const data: AirtableResponse = await response.json();

  const map = new Map<string, { id: string; name: string; role: string }>();

  for (const record of data.records) {
    const name = typeof record.fields[FIELD_USER_NAME] === 'string'
      ? record.fields[FIELD_USER_NAME]
      : 'Unknown';

    const rawRole = record.fields['Role'];
    let role = '';
    if (Array.isArray(rawRole)) {
      role = rawRole[0] || '';
    } else if (typeof rawRole === 'string') {
      role = rawRole;
    }

    map.set(record.id, { id: record.id, name, role: role.trim() });
  }

  usersCache = map;
  return map;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * List all users.
 */
export async function listUsers(): Promise<Array<{ id: string; name: string; role: string }>> {
  const usersMap = await fetchUsers();
  return Array.from(usersMap.values());
}

// =============================================================================
// MAPPER
// =============================================================================

function mapAirtableToScript(
  record: AirtableRecord,
  productsMap: Map<string, { id: string; name: string }>,
  usersMap: Map<string, { id: string; name: string }>
): Script | null {
  const fields = record.fields;

  // Required: Name
  const name = typeof fields[FIELD_NAME] === 'string'
    ? fields[FIELD_NAME]
    : null;

  if (!name) {
    return null;
  }

  // Status (no Status field in Airtable - default to 'draft')
  const status: ScriptStatus = 'draft';

  // Product (linked record)
  const productIds = fields[FIELD_PRODUCT] as string[] | undefined;
  const productId = productIds?.[0];
  const product = productId && productsMap.has(productId)
    ? productsMap.get(productId)!
    : { id: 'unknown', name: 'Unknown Product' };

  // Author (linked record to Users)
  const authorIds = fields[FIELD_AUTHOR] as string[] | undefined;
  const authorId = authorIds?.[0];
  const author = authorId && usersMap.has(authorId)
    ? usersMap.get(authorId)!
    : undefined;

  // Content
  const content = typeof fields[FIELD_CONTENT] === 'string'
    ? fields[FIELD_CONTENT]
    : undefined;

  // Approval flags
  const isApproved = fields[FIELD_IS_APPROVED] === true;
  const needsRevision = fields[FIELD_NEEDS_REVISION] === true;

  // Version
  const version = typeof fields[FIELD_VERSION] === 'number'
    ? fields[FIELD_VERSION]
    : undefined;

  // Notes
  const notes = typeof fields[FIELD_NOTES] === 'string'
    ? fields[FIELD_NOTES]
    : undefined;

  // Hook fields
  const hook = typeof fields[FIELD_HOOK] === 'string'
    ? fields[FIELD_HOOK]
    : undefined;

  const body = typeof fields[FIELD_BODY] === 'string'
    ? fields[FIELD_BODY]
    : undefined;

  const hookNumber = typeof fields[FIELD_HOOK_NUMBER] === 'number'
    ? fields[FIELD_HOOK_NUMBER]
    : undefined;

  const baseScriptNumber = typeof fields[FIELD_BASE_SCRIPT_NUMBER] === 'number'
    ? fields[FIELD_BASE_SCRIPT_NUMBER]
    : undefined;

  return {
    id: record.id,
    name,
    status,
    product,
    author,
    content,
    isApproved,
    needsRevision,
    version,
    notes,
    createdAt: record.createdTime,
    hook,
    body,
    hookNumber,
    baseScriptNumber,
  };
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * List all scripts from Airtable.
 */
export async function listScripts(): Promise<Script[]> {
  const [productsMap, usersMap] = await Promise.all([fetchProducts(), fetchUsers()]);

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset ? `${SCRIPTS_TABLE}?offset=${offset}` : SCRIPTS_TABLE;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords
    .map((record) => mapAirtableToScript(record, productsMap, usersMap))
    .filter((s): s is Script => s !== null);
}

/**
 * List scripts by product ID.
 */
export async function listScriptsByProduct(productId: string): Promise<Script[]> {
  const [productsMap, usersMap] = await Promise.all([fetchProducts(), fetchUsers()]);

  const filterFormula = encodeURIComponent(
    `FIND("${productId}", ARRAYJOIN({${FIELD_PRODUCT}}))`
  );

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset
      ? `${SCRIPTS_TABLE}?filterByFormula=${filterFormula}&offset=${offset}`
      : `${SCRIPTS_TABLE}?filterByFormula=${filterFormula}`;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords
    .map((record) => mapAirtableToScript(record, productsMap, usersMap))
    .filter((s): s is Script => s !== null);
}

/**
 * Get a single script by ID.
 */
export async function getScript(id: string): Promise<Script | null> {
  const [productsMap, usersMap] = await Promise.all([fetchProducts(), fetchUsers()]);

  try {
    const response = await airtableFetch(`${SCRIPTS_TABLE}/${id}`);
    const record: AirtableRecord = await response.json();
    return mapAirtableToScript(record, productsMap, usersMap);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Clear caches.
 */
export function clearCaches(): void {
  productsCache = null;
  usersCache = null;
}

/**
 * List all users (for author selection).
 * Returns an array of { id, name } objects.
 */


// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Create a new script.
 * Returns the created script.
 */
export async function createScript(
  productId: string,
  name: string,
  authorId: string,
  scriptNumber: number,
  content?: string
): Promise<Script> {
  const [productsMap, usersMap] = await Promise.all([fetchProducts(), fetchUsers()]);

  // Build fields object
  const fields: Record<string, unknown> = {
    [FIELD_NAME]: name,
    [FIELD_PRODUCT]: [productId],
    [FIELD_AUTHOR]: [authorId],
    [FIELD_BASE_SCRIPT_NUMBER]: scriptNumber,
  };

  // Add content if provided
  if (content?.trim()) {
    fields[FIELD_CONTENT] = content.trim();
  }

  const response = await airtableFetch(SCRIPTS_TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  const record: AirtableRecord = await response.json();
  const script = mapAirtableToScript(record, productsMap, usersMap);

  if (!script) {
    throw new Error('Failed to create script: Invalid response from Airtable');
  }

  return script;
}

/**
 * Update script content.
 * Returns the updated script.
 */
export async function updateScriptContent(
  scriptId: string,
  content: string
): Promise<Script> {
  const [productsMap, usersMap] = await Promise.all([fetchProducts(), fetchUsers()]);

  const response = await airtableFetch(`${SCRIPTS_TABLE}/${scriptId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        [FIELD_CONTENT]: content,
      },
    }),
  });

  const record: AirtableRecord = await response.json();
  const script = mapAirtableToScript(record, productsMap, usersMap);

  if (!script) {
    throw new Error('Failed to update script: Invalid response from Airtable');
  }

  return script;
}

// =============================================================================
// HOOK OPERATIONS
// =============================================================================

/**
 * Create a hook variant script.
 * Returns the created script.
 */
export async function createHookScript(
  productId: string,
  name: string,
  authorId: string,
  hook: string,
  body: string,
  hookNumber: number,
  baseScriptNumber: number
): Promise<Script> {
  const [productsMap, usersMap] = await Promise.all([fetchProducts(), fetchUsers()]);

  // Combined content = hook + body
  const content = `${hook}\n\n${body}`;

  const fields: Record<string, unknown> = {
    [FIELD_NAME]: name,
    [FIELD_PRODUCT]: [productId],
    [FIELD_AUTHOR]: [authorId],
    [FIELD_CONTENT]: content,
    [FIELD_HOOK]: hook,
    [FIELD_BODY]: body,
    [FIELD_HOOK_NUMBER]: hookNumber,
    [FIELD_BASE_SCRIPT_NUMBER]: baseScriptNumber,
  };

  const response = await airtableFetch(SCRIPTS_TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  const record: AirtableRecord = await response.json();
  const script = mapAirtableToScript(record, productsMap, usersMap);

  if (!script) {
    throw new Error('Failed to create hook script: Invalid response from Airtable');
  }

  return script;
}

/**
 * Update an existing script with hook fields.
 * Used when converting a simple script to a hook-based script.
 * Returns the updated script.
 */
export async function updateScriptHookFields(
  scriptId: string,
  hook: string,
  body: string,
  hookNumber: number,
  baseScriptNumber: number
): Promise<Script> {
  const [productsMap, usersMap] = await Promise.all([fetchProducts(), fetchUsers()]);

  // Combined content = hook + body
  const content = `${hook}\n\n${body}`;

  const response = await airtableFetch(`${SCRIPTS_TABLE}/${scriptId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        [FIELD_CONTENT]: content,
        [FIELD_HOOK]: hook,
        [FIELD_BODY]: body,
        [FIELD_HOOK_NUMBER]: hookNumber,
        [FIELD_BASE_SCRIPT_NUMBER]: baseScriptNumber,
      },
    }),
  });

  const record: AirtableRecord = await response.json();
  const script = mapAirtableToScript(record, productsMap, usersMap);

  if (!script) {
    throw new Error('Failed to update script hook fields: Invalid response from Airtable');
  }

  return script;
}
