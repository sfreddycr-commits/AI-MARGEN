import { useEffect, useId, useRef, type ReactNode, type PointerEvent } from 'react';
import { IconButton } from './Button';
import { haptic } from '../js/haptics';
import styles from '../css/sheet.module.css';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Acción principal fija al pie (SOP §31: una acción principal por pantalla). */
  footer?: ReactNode;
}

/**
 * Bottom sheet en móvil, panel lateral en desktop. Usa <dialog> nativo:
 * foco atrapado, Esc para cerrar y fondo inerte sin código extra.
 * En móvil se puede cerrar arrastrando hacia abajo desde la manija.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const drag = useRef<{ startY: number; dy: number } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      haptic('light');
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { startY: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
    ref.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onPointerUp = () => {
    if (!ref.current || !drag.current) return;
    const shouldClose = drag.current.dy > 90;
    ref.current.style.transform = '';
    drag.current = null;
    if (shouldClose) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clic en el fondo (fuera del contenido) cierra
        if (e.target === ref.current) onClose();
      }}
    >
      <div className={styles.inner}>
        <div
          className={styles.handleArea}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        >
          <span className={styles.handle} />
        </div>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton icon="close" label="Cerrar" onClick={onClose} />
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  );
}
