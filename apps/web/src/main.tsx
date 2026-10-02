import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './core/css/fonts.css';
import { router } from './core/router/router';
import { ToastProvider } from './core/ui';
import { PwaUpdater } from './core/shell/views/PwaUpdater';
import { SessionProvider } from './core/session/views/SessionProvider';
import './core/css/tokens.css';
import './core/css/base.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Errores de permisos o datos no se reintentan; los de red sí (una vez).
      retry: (count, err) => count < 1 && (err as unknown as { status?: number }).status === 0,
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró #root');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ToastProvider>
          <RouterProvider router={router} />
          {import.meta.env.PROD && <PwaUpdater />}
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
