/**
 * React hook for managing profiles state.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Profile } from './types';
import { getActiveProfiles } from './data';

interface ProfilesController {
    profiles: Profile[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useProfilesController(): ProfilesController {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfiles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const activeProfiles = await getActiveProfiles();
            setProfiles(activeProfiles);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch profiles';
            setError(message);
            console.error('Failed to fetch profiles:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    return {
        profiles,
        isLoading,
        error,
        refresh: fetchProfiles,
    };
}
