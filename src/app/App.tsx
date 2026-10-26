import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { getSessionState, clearSessionState, isAuthenticated } from '@/features/auth/session';
import { onUnauthorized } from '@/shared/api/unauthorized';
import { Toaster } from '@/shared/ui/toaster';
import { MockModeIndicator } from './MockModeIndicator';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function SessionExpiryHandler() {
  const localQueryClient = useQueryClient();

  useEffect(
    () =>
      onUnauthorized(() => {
        if (
          !isAuthenticated() &&
          getSessionState().status !== 'initializing'
        ) {
          return;
        }

        const currentPath = router.state.location.pathname;
        clearSessionState();
        localQueryClient.clear();
        toast.error('Сессия истекла. Войдите снова, чтобы продолжить.');
        if (currentPath !== '/login' && currentPath !== '/register') {
          void router.navigate({ to: '/login' });
        }
      }),
    [localQueryClient],
  );

  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionExpiryHandler />
      <RouterProvider router={router} />
      <Toaster />
      <MockModeIndicator />
    </QueryClientProvider>
  );
}
