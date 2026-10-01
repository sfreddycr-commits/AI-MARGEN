import { Link } from 'react-router';
import { EmptyState } from '../../ui';
import btn from '../../ui/css/button.module.css';
import styles from '../css/page.module.css';

/** Página no encontrada: explica qué pasó y ofrece la salida concreta. */
export function NotFoundView({ standalone = false }: { standalone?: boolean }) {
  const content = (
    <EmptyState
      icon="info"
      title="Esta página no existe"
      description="Revise la dirección o vuelva al inicio de la aplicación."
      action={
        <Link to="/app" className={`${btn.button} ${btn.primary}`}>
          Ir al inicio
        </Link>
      }
    />
  );
  return standalone ? <main className={styles.page}>{content}</main> : content;
}
