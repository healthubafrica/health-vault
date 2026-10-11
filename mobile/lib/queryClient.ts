import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 60 seconds
      staleTime: 60_000,
      // Retry once with a 2-second delay, but only for network/5xx failures:
      // a 4xx is a definite answer and retrying it just repeats the error.
      retry: (failureCount, error) =>
        failureCount < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      retryDelay: 2000,
    },
  },
});
