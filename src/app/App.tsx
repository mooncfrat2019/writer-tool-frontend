import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { getSessionState, clearSessionState, isAuthenticated } from '@/features/auth/session';
import { onUnauthorized } from '@/shared/api/unauthorized';
import { Toaster } from '@/shared/ui/toaster';
import { MockModeIndicator } from './MockModeIndicator';
import { router } from './router';

const publicPaths = new Set([
  '/',
  '/login',
  '/register',
  '/auth',
  '/pricing',
  '/verify-email',
  '/reset-password',
  '/forgot-password',
  '/confirm-email-change',
]);

function isPublicPath(path: string): boolean {
  return (
    publicPaths.has(path) ||
    path.startsWith('/legal/') ||
    path.startsWith('/payment/') ||
    path.startsWith('/share/')
  );
}

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
        if (isPublicPath(currentPath)) {
          return;
        }
        toast.error('Сессия истекла. Войдите снова, чтобы продолжить.');
        void router.navigate({ to: '/login' });
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
