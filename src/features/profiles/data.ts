/**
 * Data abstraction layer for Profiles.
 *
 * This file is the ONLY place that knows about Airtable for Profiles.
 * All Airtable field names are mapped here — nowhere else.
 */

import type { Profile, ProfileStatus } from './types';
import { airtableFetch } from '../../core/data/airtable-client';

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
