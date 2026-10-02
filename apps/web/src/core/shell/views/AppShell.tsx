import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Icon } from '../../ui';
import { useSession } from '../../session/js/session-context';
import { useNavAccess } from '../js/use-nav-access';
import { NAV_ITEMS, navOptions, visibleNavItems, type NavItem } from '../../router/navigation';
import { useOnlineStatus } from '../js/use-online-status';
import { PageSkeleton } from './PageSkeleton';
import styles from '../css/app-shell.module.css';

function Brand() {
  return (
    <span className={styles.brand} aria-label="AImargen">
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

function SidebarLink({ item }: { item: NavItem }) {
  if (item.status === 'upcoming') {
    return (
      <span className={`${styles.sideLink} ${styles.upcoming}`} aria-disabled="true">
        <Icon name={item.icon} />
        <span>{item.label}</span>
        <span className="srOnly">(próximamente)</span>
      </span>
    );
  }
  return (
    <NavLink
      to={item.to}
      end={item.to === '/app'}
      className={({ isActive }) => `${styles.sideLink} ${isActive ? styles.active : ''}`}
    >
      <Icon name={item.icon} />
      <span>{item.label}</span>
    </NavLink>
  );
}

function BottomLink({ item }: { item: NavItem }) {
  const label = item.shortLabel ?? item.label;
  if (item.status === 'upcoming') {
    return (
      <span className={`${styles.tab} ${styles.upcoming}`} aria-disabled="true">
        <Icon name={item.icon} />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <NavLink
      to={item.to}
      end={item.to === '/app'}
      className={({ isActive }) => `${styles.tab} ${isActive ? styles.activeTab : ''}`}
    >
      <Icon name={item.icon} />
      <span>{label}</span>
    </NavLink>
  );
}

/**
 * Shell autenticado (SOP §9).
 * Desktop: sidebar fijo con vidrio sutil. Móvil: barra superior con título + navegación inferior fija.
 */
export function AppShell() {
  const online = useOnlineStatus();
  const location = useLocation();
  const { me, logout } = useSession();
  const items = visibleNavItems(NAV_ITEMS, navOptions, useNavAccess());
  const main = items.filter((i) => i.group === 'main');
  const system = items.filter((i) => i.group === 'system');
  const primary = items.filter((i) => i.mobile === 'primary');
  const moreActive =
    items.some(
      (i) => i.mobile === 'more' && i.status === 'ready' && location.pathname.startsWith(i.to),
    ) || location.pathname === '/app/mas';

  return (
    <div className={styles.shell}>
      <a href="#contenido" className={styles.skip}>
        Saltar al contenido
      </a>

      <aside className={styles.sidebar} aria-label="Navegación principal">
        <div className={styles.sidebarBrand}>
          <Brand />
        </div>
        <nav className={styles.sideNav}>
          {main.map((i) => (
            <SidebarLink key={i.id} item={i} />
          ))}
        </nav>
        {system.length > 0 && (
          <nav className={styles.sideNavSecondary} aria-label="Sistema">
            {system.map((i) => (
              <SidebarLink key={i.id} item={i} />
            ))}
          </nav>
        )}
        {me && (
          <div className={styles.account}>
            <span className={styles.avatar} aria-hidden="true">
              {me.user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className={styles.accountText}>
              <span className={styles.accountName}>{me.user.name}</span>
              <span className={styles.accountTenant}>
                {me.tenant?.name ?? 'Plataforma AImargen'}
              </span>
            </span>
            <button
              type="button"
              className={styles.logout}
              onClick={() => void logout()}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <Icon name="logout" size={20} />
            </button>
          </div>
        )}
      </aside>

      <div className={styles.main}>
        {!online && (
          <div className={styles.offline} role="status">
            <Icon name="offline" size={18} />
            Sin conexión. Puede consultar lo guardado; los cambios se habilitan al reconectar.
          </div>
        )}
        <main id="contenido" className={styles.content} tabIndex={-1}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <nav className={styles.bottomNav} aria-label="Navegación principal">
        {(primary.length > 0 ? primary : items.slice(0, 1)).map((i) => (
          <BottomLink key={i.id} item={i} />
        ))}
        <NavLink
          to="/app/mas"
          className={`${styles.tab} ${moreActive ? styles.activeTab : ''}`}
          aria-current={moreActive ? 'page' : undefined}
        >
          <Icon name="more" />
          <span>Más</span>
        </NavLink>
      </nav>
    </div>
  );
}
