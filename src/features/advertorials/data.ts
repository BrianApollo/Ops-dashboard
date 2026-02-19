import { airtableFetch } from '../../core/data/airtable-client';
import type { Advertorial } from './types';

// =============================================================================
// TABLE & FIELD NAMES
// =============================================================================

const ADVERTORIALS_TABLE = 'Advertorials';
const PRODUCTS_TABLE = 'Products';

const FIELD_NAME = 'Advertorial Name';
const FIELD_PRODUCT = 'Product'; // Linked record
const FIELD_TEXT = 'Advertorial Text';
const FIELD_LINK = 'Final Advertorial Link';
const FIELD_CHECKED = 'Advertorial Checked';

const FIELD_PRODUCT_NAME = 'Product Name';

// =============================================================================
// TYPES
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
// MAPPER
// =============================================================================

function mapAirtableToAdvertorial(
    record: AirtableRecord,
    productsMap: Map<string, { id: string; name: string }>
): Advertorial | null {
    const fields = record.fields;

    const name = typeof fields[FIELD_NAME] === 'string' ? fields[FIELD_NAME] : 'Unnamed Advertorial';

    // Product (linked record)
    const productIds = fields[FIELD_PRODUCT] as string[] | undefined;
    const productId = productIds?.[0];
    const product = productId && productsMap.has(productId)
        ? productsMap.get(productId)!
        : { id: 'unknown', name: 'Unknown Product' };

    const text = typeof fields[FIELD_TEXT] === 'string' ? fields[FIELD_TEXT] : undefined;
    const link = typeof fields[FIELD_LINK] === 'string' ? fields[FIELD_LINK] : undefined;
    const isChecked = Boolean(fields[FIELD_CHECKED]);

    return {
        id: record.id,
        name,
        productId: product.id,
        productName: product.name,
        text,
        link,
        isChecked,
        createdAt: record.createdTime,
    };
}

let productsCache: Map<string, { id: string; name: string }> | null = null;

async function fetchProducts(): Promise<Map<string, { id: string; name: string }>> {
    if (productsCache) return productsCache;

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
// READ OPERATIONS
// =============================================================================

export async function listAdvertorials(): Promise<Advertorial[]> {
    const productsMap = await fetchProducts();
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
        const url = offset ? `${ADVERTORIALS_TABLE}?offset=${offset}` : ADVERTORIALS_TABLE;
        const response = await airtableFetch(url);
        const data: AirtableResponse = await response.json();
        allRecords.push(...data.records);
        offset = data.offset;
    } while (offset);

    return allRecords
        .map((record) => mapAirtableToAdvertorial(record, productsMap))
        .filter((a): a is Advertorial => a !== null);
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

export async function createAdvertorial(
    name: string,
    productId: string,
    text?: string,
    link?: string
): Promise<void> {
    const fields: Record<string, unknown> = {
        [FIELD_NAME]: name,
        [FIELD_PRODUCT]: [productId],
    };

    if (text) fields[FIELD_TEXT] = text;
    if (link) fields[FIELD_LINK] = link;

    const response = await airtableFetch(ADVERTORIALS_TABLE, {
        method: 'POST',
        body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to create advertorial: ${response.status} ${errorBody}`);
    }
}

export async function updateAdvertorial(id: string, fields: Partial<Advertorial>): Promise<void> {
    const airtableFields: Record<string, unknown> = {};

    if (fields.isChecked !== undefined) {
        airtableFields[FIELD_CHECKED] = fields.isChecked;
    }
    if (fields.name !== undefined) {
        airtableFields[FIELD_NAME] = fields.name;
    }
    if (fields.text !== undefined) {
        airtableFields[FIELD_TEXT] = fields.text;
    }
    if (fields.link !== undefined) {
        airtableFields[FIELD_LINK] = fields.link;
    }

    const response = await airtableFetch(`${ADVERTORIALS_TABLE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields: airtableFields }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to update advertorial: ${response.status} ${errorBody}`);
    }
}
