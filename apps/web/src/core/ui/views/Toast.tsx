import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { haptic } from '../js/haptics';
import { ToastContext, type ToastApi, type ToastTone } from '../js/toast-context';
import styles from '../css/toast.module.css';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
}

/** Confirmaciones breves. Se anuncian por aria-live; el texto nombra la acción realizada. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi['show']>(
    (message, opts = {}) => {
      const id = ++seq.current;
      const tone = opts.tone ?? 'success';
      setItems((list) => [...list.slice(-2), { id, tone, message, action: opts.action }]);
      haptic(tone === 'error' ? 'error' : 'light');
      const ms = opts.durationMs ?? (opts.action ? 8000 : 3500);
      if (ms > 0) window.setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} aria-live="polite" aria-relevant="additions">
        {items.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.tone]}`}>
            <Icon
              name={t.tone === 'error' ? 'alert' : t.tone === 'info' ? 'info' : 'check'}
              size={18}
            />
            <span className={styles.message}>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
