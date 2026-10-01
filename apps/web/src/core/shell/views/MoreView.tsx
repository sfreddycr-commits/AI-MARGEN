import { Link } from 'react-router';
import { Icon } from '../../ui';
import { NAV_ITEMS, navOptions, visibleNavItems } from '../../router/navigation';
import { Page } from './Page';
import styles from '../css/more.module.css';

/** Vista "Más" (móvil): accesos a los módulos que no caben en la barra inferior. */
export function MoreView() {
  const items = visibleNavItems(NAV_ITEMS, navOptions).filter((i) => i.mobile === 'more');
  const groups = [
    { id: 'main', label: 'Negocio', items: items.filter((i) => i.group === 'main') },
    { id: 'system', label: 'Sistema', items: items.filter((i) => i.group === 'system') },
  ].filter((g) => g.items.length > 0);

  return (
    <Page title="Más">
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`more-${g.id}`} className={styles.group}>
          <h2 id={`more-${g.id}`} className={styles.groupTitle}>
            {g.label}
          </h2>
          <ul className={styles.list}>
            {g.items.map((i) => (
              <li key={i.id}>
                {i.status === 'ready' ? (
                  <Link to={i.to} className={styles.row}>
                    <span className={styles.icon}>
                      <Icon name={i.icon} />
                    </span>
                    <span className={styles.label}>{i.label}</span>
                    <Icon name="chevronRight" size={18} className={styles.chevron} />
                  </Link>
                ) : (
                  <span className={`${styles.row} ${styles.upcoming}`} aria-disabled="true">
                    <span className={styles.icon}>
                      <Icon name={i.icon} />
                    </span>
                    <span className={styles.label}>{i.label}</span>
                    <span className={styles.soon}>Próximamente</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}
