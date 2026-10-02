import styles from '../css/session.module.css';

/** Carga inicial mientras se verifica la sesión. */
export function FullScreenLoader() {
  return (
    <div className={styles.loader} role="status" aria-live="polite">
      <span className={styles.mark} aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="srOnly">Cargando AImargen…</span>
    </div>
  );
}
