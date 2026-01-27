import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,                    // Retry failed requests twice
      retryDelay: 1000,            // Wait 1 second between retries
      staleTime: 30 * 1000,        // Data is fresh for 30 seconds
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    },
  },
});
