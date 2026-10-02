import { NavLink } from 'react-router';
import { Icon, type IconName } from '../../../core/ui';
import styles from '../css/admin.module.css';

const SECTIONS: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: '/app/admin', label: 'Resumen', icon: 'pulse', end: true },
  { to: '/app/admin/tenants', label: 'Negocios', icon: 'building' },
  { to: '/app/admin/users', label: 'Usuarios', icon: 'users' },
  { to: '/app/admin/ai', label: 'Uso de IA', icon: 'ai' },
  { to: '/app/admin/audit', label: 'Auditoría', icon: 'history' },
];

/** Navegación local entre las secciones del panel de plataforma. */
export function AdminNav() {
  return (
    <nav className={styles.nav} aria-label="Secciones del panel">
      {SECTIONS.map((s) => (
        <NavLink
          key={s.to}
          to={s.to}
          end={s.end}
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}
        >
          <Icon name={s.icon} size={18} />
          {s.label}
        </NavLink>
      ))}
    </nav>
  );
}
