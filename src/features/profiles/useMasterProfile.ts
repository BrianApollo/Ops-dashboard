
import { useQuery } from '@tanstack/react-query';
import { getMasterProfileId } from './data';

export function useMasterProfile() {
    return useQuery({
        queryKey: ['masterProfile'],
        queryFn: getMasterProfileId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
