/**
 * Data abstraction layer for Users.
 */

import { User } from './types.ts';
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

// =============================================================================
// TABLE & FIELD NAMES
// =============================================================================

const USERS_TABLE = 'Users';

// Field names (exact Airtable names)
const FIELD_EMAIL = 'Email';
const FIELD_PASSWORD = 'Password';
const FIELD_ROLE = 'Role';

// =============================================================================
// AIRTABLE HELPERS
// =============================================================================

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
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    return response;
}

// =============================================================================
// AUTH OPERATIONS
// =============================================================================

export async function verifyCredentials(email: string, password: string): Promise<User | null> {
    // Escape quotes in formula
    const safeEmail = email.replace(/'/g, "\\'");
    // We filter by Email first
    const formula = `{${FIELD_EMAIL}} = '${safeEmail}'`;
    const url = `${USERS_TABLE}?filterByFormula=${encodeURIComponent(formula)}`;

    try {
        const response = await airtableFetch(url);
        const data = await response.json();

        if (data.records && data.records.length > 0) {
            // Find record with matching password
            // Note: In production we should HASH passwords. This is a simple implementation as requested.
            const userRecord = data.records.find((record: any) => record.fields[FIELD_PASSWORD] === password);

            if (userRecord) {
                const rawRole = userRecord.fields[FIELD_ROLE];
                let role = '';
                if (Array.isArray(rawRole)) {
                    role = rawRole[0] || '';
                } else if (typeof rawRole === 'string') {
                    role = rawRole;
                }

                return {
                    id: userRecord.id,
                    email: userRecord.fields[FIELD_EMAIL],
                    role: role.trim(),
                };
            }
        }
        return null;
    } catch (error) {
        console.error("Error verifying credentials:", error);
        return null;
    }
}
