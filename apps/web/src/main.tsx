import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './core/css/fonts.css';
import { router } from './core/router/router';
import { ToastProvider } from './core/ui';
import { PwaUpdater } from './core/shell/views/PwaUpdater';
import './core/css/tokens.css';
import './core/css/base.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: true },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró #root');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
        {import.meta.env.PROD && <PwaUpdater />}
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
