import styles from '../css/auth.module.css';

/** Marca AImargen: isotipo de dos barras (costo | margen) + palabra. `light` sobre fondo azul. */
export function Brand({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <span className={`${styles.brand} ${tone === 'light' ? styles.brandLight : ''}`}>
      <span className={styles.brandMark} aria-hidden="true">
        <span />
        <span />
      </span>
      <span className={styles.brandWord}>
        AI<b>margen</b>
      </span>
    </span>
  );
}
