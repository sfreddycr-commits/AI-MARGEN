import { Link } from 'react-router';
import { Button, Icon } from '../../ui';
import { useSession } from '../../session/js/session-context';
import { ROLE_LABELS } from '../../session/js/session-types';
import { useNavAccess } from '../js/use-nav-access';
import { NAV_ITEMS, navOptions, visibleNavItems } from '../../router/navigation';
import { Page } from './Page';
import styles from '../css/more.module.css';

/** Vista "Más" (móvil): accesos a los módulos que no caben en la barra inferior. */
export function MoreView() {
  const { me, logout } = useSession();
  const items = visibleNavItems(NAV_ITEMS, navOptions, useNavAccess()).filter(
    (i) => i.mobile === 'more',
  );
  const groups = [
    { id: 'main', label: 'Negocio', items: items.filter((i) => i.group === 'main') },
    { id: 'system', label: 'Sistema', items: items.filter((i) => i.group === 'system') },
  ].filter((g) => g.items.length > 0);

  return (
    <Page title="Más">
      {me && (
        <section className={styles.account} aria-label="Cuenta">
          <span className={styles.avatar} aria-hidden="true">
            {me.user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className={styles.accountText}>
            <strong>{me.user.name}</strong>
            <span>
              {me.tenant?.name ?? 'Plataforma AImargen'} · {ROLE_LABELS[me.user.role] ?? me.user.role}
            </span>
          </span>
        </section>
      )}
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
      <Button variant="secondary" icon="logout" block onClick={() => void logout()}>
        Cerrar sesión
      </Button>
    </Page>
  );
}
