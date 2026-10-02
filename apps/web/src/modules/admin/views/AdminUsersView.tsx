import { Link } from 'react-router';
import {
  DataTable,
  EmptyState,
  Notice,
  SearchField,
  Skeleton,
  StatusBadge,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { formatDate } from '../../../core/js/format';
import { ROLE_LABELS } from '../../../core/session/js/session-types';
import { useAdminUsers } from '../js/use-admin';
import { statusOf, USER_STATUS } from '../js/admin-labels';
import { AdminNav } from './AdminNav';
import styles from '../css/admin.module.css';

export default function AdminUsersView() {
  const users = useAdminUsers();

  return (
    <Page title="Usuarios" description="Localice a cualquier usuario de la plataforma.">
      <AdminNav />
      <SearchField
        value={users.q}
        onChange={users.setQ}
        placeholder="Buscar por nombre o correo"
        label="Buscar usuarios"
      />
      {users.error && (
        <Notice tone="danger" title="No se pudieron cargar los usuarios">
          {users.error.message}
        </Notice>
      )}
      {users.isPending ? (
        <Skeleton height={240} radius={14} />
      ) : users.items.length === 0 ? (
        <EmptyState
          icon="search"
          title="Sin resultados"
          description={
            users.term
              ? `Ningún usuario coincide con "${users.term}". Revise el correo o pruebe con parte del nombre.`
              : 'Aún no hay usuarios registrados.'
          }
        />
      ) : (
        <>
          <p className={styles.pagerText} aria-live="polite">
            {users.items.length === 50
              ? 'Mostrando los primeros 50. Precise la búsqueda para ver otros.'
              : `${users.items.length} ${users.items.length === 1 ? 'usuario' : 'usuarios'}`}
          </p>
          <DataTable
            caption="Usuarios de la plataforma"
            columns={[
              { key: 'user', label: 'Usuario' },
              { key: 'tenant', label: 'Negocio' },
              { key: 'role', label: 'Rol' },
              { key: 'status', label: 'Estado' },
              { key: 'login', label: 'Último ingreso' },
              { key: 'created', label: 'Alta' },
            ]}
            rows={users.items.map((u) => {
              const st = statusOf(USER_STATUS, u.status);
              return {
                key: u.uuid,
                user: (
                  <span className={styles.cellMain}>
                    <span>{u.name}</span>
                    <span className={styles.cellSub}>{u.email}</span>
                  </span>
                ),
                tenant: u.tenantUuid ? (
                  <Link className={styles.link} to={`/app/admin/tenants/${u.tenantUuid}`}>
                    {u.tenantName ?? 'Ver negocio'}
                  </Link>
                ) : (
                  <span className={styles.muted}>Sin negocio</span>
                ),
                role: ROLE_LABELS[u.role] ?? u.role,
                status: (
                  <span className={styles.badges}>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                    {u.locked && <StatusBadge tone="danger">Bloqueo temporal</StatusBadge>}
                    {!u.emailVerified && (
                      <StatusBadge tone="warning">Correo sin verificar</StatusBadge>
                    )}
                  </span>
                ),
                login: formatDate(u.lastLoginAt),
                created: formatDate(u.createdAt),
              };
            })}
          />
        </>
      )}
    </Page>
  );
}
