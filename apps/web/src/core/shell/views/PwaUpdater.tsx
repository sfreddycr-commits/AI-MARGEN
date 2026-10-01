import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '../../ui';

/**
 * Registra el service worker y avisa cuando hay una versión nueva.
 * La actualización la decide la persona (no se recarga a mitad de un formulario).
 * Revisa actualizaciones cada hora mientras la app esté abierta.
 */
export function PwaUpdater() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      window.setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast.show('Hay una nueva versión de AImargen.', {
      tone: 'info',
      durationMs: 0,
      action: { label: 'Actualizar', onClick: () => void updateServiceWorker(true) },
    });
    setNeedRefresh(false);
  }, [needRefresh, setNeedRefresh, toast, updateServiceWorker]);

  useEffect(() => {
    if (!offlineReady) return;
    toast.show('AImargen quedó lista para abrirse sin conexión.', { tone: 'info' });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, toast]);

  return null;
}
