import { createBrowserRouter, Navigate } from 'react-router';
import { SystemStatusView } from '../../modules/system/views/SystemStatusView';

/**
 * Router de la app. Cada módulo aporta sus rutas.
 * Etapa 0: solo diagnóstico. Landing (Etapa 2) y /app (Etapa 3+) se agregan después.
 */
export const router = createBrowserRouter([
  { path: '/estado', element: <SystemStatusView /> },
  { path: '*', element: <Navigate to="/estado" replace /> },
]);
