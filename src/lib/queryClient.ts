import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // A 401 is handled globally (redirect to /login) and a 403/404
        // won't fix itself on retry — only retry genuinely transient
        // failures, and only twice.
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
});
