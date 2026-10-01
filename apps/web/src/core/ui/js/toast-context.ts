import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastApi {
  show: (
    message: string,
    opts?: {
      tone?: ToastTone;
      action?: { label: string; onClick: () => void };
      /** 0 = no se cierra solo. */
      durationMs?: number;
    },
  ) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
