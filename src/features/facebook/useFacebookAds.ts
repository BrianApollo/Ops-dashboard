/**
 * useFacebookAds Hook
 *
 * Fetches Facebook ad accounts when a profile with permanent token is provided.
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

const FB_GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// =============================================================================
// TYPES
// =============================================================================

export interface FacebookUser {
    id: string;
    name: string;
}

export interface FacebookAdAccount {
    id: string;
    name: string;
    account_id: string;
    account_status: number;
    currency: string;
}

export interface FacebookAdsData {
    user: FacebookUser | null;
    adAccounts: FacebookAdAccount[];
}

export interface UseFacebookAdsReturn {
    /** Fetched data */
    data: FacebookAdsData | null;
    /** Loading state */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Manually refetch data */
    refetch: () => Promise<void>;
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
// INDIVIDUAL API CALLS
// =============================================================================

/** GET /me - Fetch user info */
async function fetchUserInfo(token: string): Promise<FacebookUser> {
    return fbFetch<FacebookUser>('/me?fields=id,name', token);
}

/** GET /me/adaccounts - Fetch ad accounts */
async function fetchAdAccounts(token: string): Promise<FacebookAdAccount[]> {
    const response = await fbFetch<{ data: FacebookAdAccount[] }>(
        '/me/adaccounts?fields=id,name,account_id,account_status,currency',
        token
    );
    return response.data || [];
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Hook to fetch Facebook ad accounts when a profile token is provided.
 *
 * @param token - The permanent token from the selected profile (null to skip fetching)
 */
export function useFacebookAds(token: string | null): UseFacebookAdsReturn {
    const [data, setData] = useState<FacebookAdsData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!token) {
            setData(null);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Fetch user and ad accounts in parallel
            const [user, adAccounts] = await Promise.all([
                fetchUserInfo(token).catch((err) => {
                    console.error('Failed to fetch user info:', err);
                    return null;
                }),
                fetchAdAccounts(token).catch((err) => {
                    console.error('Failed to fetch ad accounts:', err);
                    return [];
                }),
            ]);

            setData({
                user,
                adAccounts,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch Facebook data';
            setError(message);
            console.error('Facebook API error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Fetch when token changes
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchData,
    };
}
