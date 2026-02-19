/**
 * Data abstraction layer for Profiles.
 *
 * This file is the ONLY place that knows about Airtable for Profiles.
 * All Airtable field names are mapped here — nowhere else.
 */

import type { Profile, ProfileStatus } from './types';
import { throttledAirtableFetch } from '../../core/data/airtable-throttle';

// =============================================================================
// AIRTABLE CONFIG
// =============================================================================

const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;

function validateConfig(): { apiKey: string; baseId: string } {
    const missing: string[] = [];

    if (!AIRTABLE_API_KEY) {
        missing.push('VITE_AIRTABLE_API_KEY');
    }
    if (!AIRTABLE_BASE_ID) {
        missing.push('VITE_AIRTABLE_BASE_ID');
    }

    if (missing.length > 0) {
        throw new Error(
            `Airtable configuration error: Missing environment variable(s): ${missing.join(', ')}. ` +
            `Add them to your .env file.`
        );
    }

    return {
        apiKey: AIRTABLE_API_KEY as string,
        baseId: AIRTABLE_BASE_ID as string,
    };
}

const config = validateConfig();
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${config.baseId}`;

// Table name
const PROFILES_TABLE = 'Profiles';

// =============================================================================
// AIRTABLE FIELD MAPPINGS
// =============================================================================

const FIELD_PROFILE_ID = 'Profile ID';
const FIELD_PROFILE_NAME = 'Profile Name';
const FIELD_PROFILE_STATUS = 'Profile Status';
const FIELD_PERMANENT_TOKEN = 'Permanent Token';

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

async function airtableFetch(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    const response = await throttledAirtableFetch(`${AIRTABLE_API_URL}/${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        let errorMessage = `Airtable API error: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                const errType = errorData.error.type || 'UNKNOWN_ERROR';
                const errMsg = errorData.error.message || '';
                errorMessage = `Airtable error (${errType}): ${errMsg}`;
            }
        } catch {
            // Use default message
        }
        throw new Error(errorMessage);
    }

    return response;
}

// =============================================================================
// MAPPER
// =============================================================================

function mapAirtableToProfile(record: AirtableRecord): Profile | null {
    const fields = record.fields;

    const profileId = typeof fields[FIELD_PROFILE_ID] === 'string'
        ? fields[FIELD_PROFILE_ID]
        : '';

    const profileName = typeof fields[FIELD_PROFILE_NAME] === 'string'
        ? fields[FIELD_PROFILE_NAME]
        : '';

    const status = typeof fields[FIELD_PROFILE_STATUS] === 'string'
        ? (fields[FIELD_PROFILE_STATUS] as ProfileStatus)
        : 'Inactive';

    const permanentToken = typeof fields[FIELD_PERMANENT_TOKEN] === 'string'
        ? fields[FIELD_PERMANENT_TOKEN]
        : '';

    // Skip records without a profile name
    if (!profileName) {
        return null;
    }

    return {
        id: record.id,
        profileId,
        profileName,
        status,
        permanentToken,
    };
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * List all profiles from Airtable.
 */
export async function listProfiles(): Promise<Profile[]> {
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
        const url = offset ? `${PROFILES_TABLE}?offset=${offset}` : PROFILES_TABLE;
        const response = await airtableFetch(url);
        const data: AirtableResponse = await response.json();
        allRecords.push(...data.records);
        offset = data.offset;
    } while (offset);

    return allRecords
        .map((record) => mapAirtableToProfile(record))
        .filter((p): p is Profile => p !== null);
}

/**
 * Get only Active profiles.
 */
export async function getActiveProfiles(): Promise<Profile[]> {
    const filterFormula = encodeURIComponent(`({${FIELD_PROFILE_STATUS}} = 'Active')`);
    const response = await airtableFetch(`${PROFILES_TABLE}?filterByFormula=${filterFormula}`);
    const data: AirtableResponse = await response.json();

    return data.records
        .map((record) => mapAirtableToProfile(record))
        .filter((p): p is Profile => p !== null);
}
