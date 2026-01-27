/**
 * useFacebookPixels Hook
 *
 * Fetches Facebook pixels for a specific ad account.
 */

import { useState, useCallback } from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

const FB_GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// =============================================================================
// TYPES
// =============================================================================

export interface FacebookPixel {
    id: string;
    name: string;
    creation_time?: string;
    owner_business?: {
        id: string;
        name: string;
    };
}

export interface UseFacebookPixelsReturn {
    /** Fetched pixels */
    pixels: FacebookPixel[];
    /** Loading state */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Fetch pixels for a specific ad account */
    fetchByAdAccount: (adAccountId: string, token: string) => Promise<void>;
    /** Clear the data */
    clear: () => void;
}

// =============================================================================
// API HELPERS
// =============================================================================

async function fbFetch<T>(endpoint: string, token: string): Promise<T> {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${FB_GRAPH_API_BASE}${endpoint}${separator}access_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
        let errorMessage = `Facebook API error: ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage = `Facebook error: ${errorData.error.message}`;
            }
        } catch {
            // Use default message
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Hook to fetch Facebook pixels for an ad account.
 */
export function useFacebookPixels(): UseFacebookPixelsReturn {
    const [pixels, setPixels] = useState<FacebookPixel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch pixels for a specific ad account.
     * GET /act_{id}/adspixels
     */
    const fetchByAdAccount = useCallback(async (adAccountId: string, token: string) => {
        if (!adAccountId || !token) {
            setPixels([]);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Ensure account ID has act_ prefix
            const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

            const response = await fbFetch<{ data: FacebookPixel[] }>(
                `/${accountId}/adspixels?fields=id,name,creation_time,owner_business`,
                token
            );

            setPixels(response.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch pixels';
            setError(message);
            console.error('Failed to fetch pixels:', err);
            setPixels([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setPixels([]);
        setError(null);
    }, []);

    return {
        pixels,
        isLoading,
        error,
        fetchByAdAccount,
        clear,
    };
}
