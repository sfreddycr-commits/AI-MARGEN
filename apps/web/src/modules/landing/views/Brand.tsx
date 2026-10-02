import styles from '../css/public-layout.module.css';

/** Marca AImargen con el isotipo de dos barras (costo | margen), igual que en la app. */
export function Brand() {
  return (
    <span className={styles.brand}>
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
