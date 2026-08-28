import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 60 seconds
      staleTime: 60_000,
      // Retry failed requests once, with a 2-second delay
      retry: 1,
      retryDelay: 2000,
    },
  },
});
