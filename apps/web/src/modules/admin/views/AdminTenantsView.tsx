import {
  Button,
  Chips,
  EmptyState,
  List,
  ListRow,
  Notice,
  SearchField,
  Skeleton,
  StatusBadge,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { formatDate } from '../../../core/js/format';
import { useAdminTenants, type TenantFilter } from '../js/use-admin';
import { formatInt, statusOf, TENANT_STATUS } from '../js/admin-labels';
import { AdminNav } from './AdminNav';
import styles from '../css/admin.module.css';

export default function AdminTenantsView() {
  const list = useAdminTenants();

  return (
    <Page title="Negocios" description="Todos los negocios registrados en AImargen.">
      <AdminNav />
      <div className={styles.toolbar}>
        <SearchField
          value={list.q}
          onChange={list.setQ}
          placeholder="Buscar por nombre, correo o identificador"
          label="Buscar negocios"
        />
        <Chips<TenantFilter>
          label="Filtrar por estado"
          value={list.status}
          onChange={list.setStatus}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Activos' },
            { value: 'suspended', label: 'Suspendidos' },
          ]}
        />
      </div>
      {list.error && (
        <Notice tone="danger" title="No se pudieron cargar los negocios">
          {list.error.message}
        </Notice>
      )}
      {list.isPending ? (
        <List label="Cargando">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={styles.skeletonRow}>
              <Skeleton width="45%" />
              <Skeleton width="30%" height={12} />
            </li>
          ))}
        </List>
      ) : list.items.length === 0 ? (
        list.filtered ? (
          <EmptyState
            icon="search"
            title="Sin resultados"
            description="Ningún negocio coincide con la búsqueda o el filtro."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  list.setQ('');
                  list.setStatus('all');
                }}
              >
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="building"
            title="Aún no hay negocios"
            description="Cuando alguien se registre y configure su negocio aparecerá aquí."
          />
        )
      ) : (
        <>
          <p className={styles.pagerText} aria-live="polite">
            {formatInt(list.total)} {list.total === 1 ? 'negocio' : 'negocios'}
          </p>
          <List label="Negocios">
            {list.items.map((t) => {
              const st = statusOf(TENANT_STATUS, t.status);
              return (
                <ListRow
                  key={t.uuid}
                  to={`/app/admin/tenants/${t.uuid}`}
                  icon="building"
                  title={t.name}
                  subtitle={[
                    t.email ?? t.slug,
                    !t.onboardingCompleted && 'Sin terminar configuración',
                    t.isDemo && 'Demo',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  badge={<StatusBadge tone={st.tone}>{st.label}</StatusBadge>}
                  value={`${formatInt(t.usersCount)} ${t.usersCount === 1 ? 'usuario' : 'usuarios'}`}
                  valueCaption={
                    t.lastActivityAt
                      ? `Actividad: ${formatDate(t.lastActivityAt)}`
                      : `Alta: ${formatDate(t.createdAt)}`
                  }
                  muted={t.status === 'suspended'}
                />
              );
            })}
          </List>
          {list.pages > 1 && (
            <div className={styles.pager}>
              <Button
                variant="secondary"
                icon="chevronLeft"
                disabled={list.page <= 1 || list.isFetching}
                onClick={() => list.setPage(list.page - 1)}
              >
                Anterior
              </Button>
              <span className={styles.pagerText}>
                Página {list.page} de {list.pages}
              </span>
              <Button
                variant="secondary"
                disabled={list.page >= list.pages || list.isFetching}
                onClick={() => list.setPage(list.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
