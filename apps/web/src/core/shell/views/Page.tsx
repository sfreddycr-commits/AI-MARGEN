import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { IconButton } from '../../ui';
import styles from '../css/page.module.css';

interface PageProps {
  title: string;
  description?: string;
  /** Acción principal de la pantalla (máximo una, SOP §31). */
  action?: ReactNode;
  /** Muestra "volver" en móvil (pantallas de segundo nivel). */
  back?: string;
  children: ReactNode;
}

/** Estructura estándar de página: título, descripción opcional, acción principal y contenido. */
export function Page({ title, description, action, back, children }: PageProps) {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = `${title} | AImargen`;
  }, [title]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          {back && (
            <IconButton
              icon="chevronLeft"
              label="Volver"
              className={styles.back}
              onClick={() => navigate(back)}
            />
          )}
          <h1 className={styles.title}>{title}</h1>
          {action && <div className={styles.action}>{action}</div>}
        </div>
        {description && <p className={styles.description}>{description}</p>}
      </header>
      {children}
    </div>
  );
}
