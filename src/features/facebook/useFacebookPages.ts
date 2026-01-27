/**
 * useFacebookPages Hook
 *
 * Fetches Facebook pages for the user (pages are user-level, not ad account level).
 */

import { useState, useCallback } from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

const FB_GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// =============================================================================
// TYPES
// =============================================================================

export interface FacebookPage {
    id: string;
    name: string;
    access_token: string;
    category: string;
}

export interface UseFacebookPagesReturn {
    /** Fetched pages */
    pages: FacebookPage[];
    /** Loading state */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Fetch pages for the user (triggered when ad account is selected) */
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
 * Hook to fetch Facebook pages.
 * Note: Pages are user-level, but we trigger fetch when ad account is selected
 * to match the workflow.
 */
export function useFacebookPages(): UseFacebookPagesReturn {
    const [pages, setPages] = useState<FacebookPage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch pages for the user.
     * GET /me/accounts
     * Note: adAccountId is not used for the API call (pages are user-level)
     * but is required to match the interface pattern.
     */
    const fetchByAdAccount = useCallback(async (_adAccountId: string, token: string) => {
        if (!token) {
            setPages([]);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fbFetch<{ data: FacebookPage[] }>(
                '/me/accounts?fields=id,name,access_token,category',
                token
            );

            setPages(response.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch pages';
            setError(message);
            console.error('Failed to fetch pages:', err);
            setPages([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setPages([]);
        setError(null);
    }, []);

    return {
        pages,
        isLoading,
        error,
        fetchByAdAccount,
        clear,
    };
}
