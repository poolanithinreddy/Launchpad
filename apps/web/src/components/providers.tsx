"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster, toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (query.queryKey[0] === "session") {
              return;
            }

            toast.error(getApiErrorMessage(error, "Request failed."));
          }
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            toast.error(getApiErrorMessage(error, "Request failed."));
          }
        }),
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
