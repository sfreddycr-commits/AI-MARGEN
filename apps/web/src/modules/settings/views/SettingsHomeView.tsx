import { List, ListRow, type IconName } from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useTenant } from '../../../core/session/js/session-context';
import { ROLE_LABELS } from '../../../core/session/js/session-types';
import styles from '../css/settings.module.css';

interface Entry {
  to: string;
  icon: IconName;
  title: string;
  subtitle: string;
  permission?: string;
}

export default function SettingsHomeView() {
  const { can, tenant, me } = useTenant();
  const groups: Array<{ id: string; label: string; items: Entry[] }> = [
    {
      id: 'business',
      label: 'Negocio',
      items: [
        {
          to: '/app/settings/business',
          icon: 'building',
          title: 'Datos del negocio',
          subtitle: `${tenant.name} · moneda, país y zona horaria`,
          permission: 'tenant.read',
        },
        {
          to: '/app/settings/costing',
          icon: 'costs',
          title: 'Costeo y márgenes',
          subtitle: 'Margen objetivo, días de operación y método de costo',
          permission: 'settings.read',
        },
        {
          to: '/app/settings/categories',
          icon: 'grid',
          title: 'Categorías',
          subtitle: 'Agrupe ingredientes y productos',
          permission: 'tenant.read',
        },
      ],
    },
    {
      id: 'team',
      label: 'Equipo y seguridad',
      items: [
        {
          to: '/app/settings/users',
          icon: 'users',
          title: 'Usuarios',
          subtitle: 'Invite a su equipo y defina qué puede hacer cada persona',
          permission: 'users.read',
        },
        {
          to: '/app/settings/audit',
          icon: 'history',
          title: 'Auditoría',
          subtitle: 'Quién cambió qué y cuándo',
          permission: 'audit.read',
        },
      ],
    },
    {
      id: 'account',
      label: 'Mi cuenta',
      items: [
        {
          to: '/app/settings/account',
          icon: 'user',
          title: me?.user.name ?? 'Mi cuenta',
          subtitle: `${ROLE_LABELS[me?.user.role ?? ''] ?? ''} · contraseña y cierre de sesión`,
        },
      ],
    },
  ];

  return (
    <Page title="Configuración" back="/app/mas">
      <div className={styles.menuGrid}>
        {groups.map((g) => {
          const items = g.items.filter((i) => !i.permission || can(i.permission));
          if (items.length === 0) return null;
          return (
            <section key={g.id} className={styles.group} aria-labelledby={`settings-${g.id}`}>
              <h2 id={`settings-${g.id}`} className={styles.groupTitle}>
                {g.label}
              </h2>
              <List label={g.label}>
                {items.map((i) => (
                  <ListRow
                    key={i.to}
                    to={i.to}
                    icon={i.icon}
                    title={i.title}
                    subtitle={i.subtitle}
                  />
                ))}
              </List>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
