import { Skeleton } from '../../ui';
import styles from '../css/page.module.css';

/** Esqueleto genérico mientras carga un módulo (code splitting). */
export function PageSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Cargando">
      <div className={styles.header}>
        <Skeleton width="45%" height={30} />
        <Skeleton width="70%" height={16} />
      </div>
      <div className={styles.stack}>
        <Skeleton height={88} radius={14} />
        <Skeleton height={88} radius={14} />
        <Skeleton height={88} radius={14} />
      </div>
    </div>
  );
}
