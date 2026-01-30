import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useListController } from '../../core/list';
import { listAdvertorials, createAdvertorial, updateAdvertorial } from './data';
import type { Advertorial, AdvertorialFilters } from './types';

interface UseAdvertorialsControllerProps {
    initialFilters?: AdvertorialFilters;
}

export function useAdvertorialsController({ initialFilters }: UseAdvertorialsControllerProps = {}) {
    const {
        data: allAdvertorials = [],
        isLoading,
        refetch
    } = useQuery({
        queryKey: ['advertorials'],
        queryFn: listAdvertorials,
    });

    // Filter logic handled by list controller or pre-filtered here
    const filteredAdvertorials = useMemo(() => {
        let result = allAdvertorials;

        if (initialFilters?.productId) {
            result = result.filter((a) => a.productId === initialFilters.productId);
        }

        return result;
    }, [allAdvertorials, initialFilters?.productId]);

    // Use the shared list controller for pagination/filtering
    const list = useListController<Advertorial, AdvertorialFilters>({
        records: filteredAdvertorials,
        initialFilters: initialFilters ?? { productId: null },
        initialPageSize: 20,
    });

    const createNewAdvertorial = async (name: string, productId: string, text?: string, link?: string) => {
        await createAdvertorial(name, productId, text, link);
        await refetch();
    };

    const approveAdvertorial = async (id: string) => {
        await updateAdvertorial(id, { isChecked: true });
        await refetch();
    };

    const updateContent = async (id: string, fields: Partial<Advertorial>) => {
        await updateAdvertorial(id, fields);
        await refetch();
    };

    return {
        advertorials: allAdvertorials,
        filteredAdvertorials, // Expose pre-filtered list if needed directly
        list, // Expose list controller for UI pagination
        isLoading,
        refetch,
        createAdvertorial: createNewAdvertorial,
        updateAdvertorial: updateContent,
        approveAdvertorial,
        // Add setters for external filter control if needed
        setProductFilter: (productId: string | null) => list.setFilters({ ...list.filters, productId }),
    };
}
