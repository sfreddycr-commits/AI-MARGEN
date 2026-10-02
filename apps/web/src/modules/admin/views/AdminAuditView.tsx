import { useSearchParams } from 'react-router';
import { Button, Chips, EmptyState, Notice, SearchField, Skeleton } from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { formatDateTime } from '../../../core/js/format';
import { useAdminAudit } from '../js/use-admin';
import type { AdminAuditEntry } from '../js/admin.service';
import { AUDIT_PRESETS, compactJson, humanizeAction } from '../js/admin-labels';
import { AdminNav } from './AdminNav';
import styles from '../css/admin.module.css';

export default function AdminAuditView() {
  const [params, setParams] = useSearchParams();
  const audit = useAdminAudit({ tenant: params.get('tenant') ?? undefined });
  const preset = AUDIT_PRESETS.find((p) => p.value === audit.action)?.value ?? null;

  return (
    <Page title="Auditoría" description="Acciones registradas en toda la plataforma.">
      <AdminNav />
      <div className={styles.toolbar}>
        <SearchField
          value={audit.action}
          onChange={audit.setAction}
          placeholder="Filtrar por código de acción (ej. admin.)"
          label="Filtrar por acción"
        />
        <Chips
          label="Filtros rápidos"
          value={preset ?? '__custom'}
          onChange={(v) => audit.setAction(v === '__custom' ? audit.action : v)}
          options={AUDIT_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
        />
      </div>
      {audit.tenant && (
        <Notice
          tone="info"
          title="Mostrando solo un negocio"
          action={
            <Button
              variant="ghost"
              onClick={() => {
                audit.clearTenant();
                setParams({}, { replace: true });
              }}
            >
              Ver todos
            </Button>
          }
        />
      )}
      {audit.error && (
        <Notice tone="danger" title="No se pudo cargar la auditoría">
          {audit.error.message}
        </Notice>
      )}
      {audit.isPending ? (
        <ul className={styles.auditList} aria-label="Cargando">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={styles.auditItem}>
              <Skeleton width="50%" />
              <Skeleton width="70%" height={12} />
            </li>
          ))}
        </ul>
      ) : audit.items.length === 0 ? (
        <EmptyState
          icon="history"
          title="Sin registros"
          description="No hay acciones que coincidan con el filtro."
          action={
            audit.action && (
              <Button variant="secondary" onClick={() => audit.setAction('')}>
                Quitar filtro
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className={styles.auditList} aria-label="Registros de auditoría">
            {audit.items.map((a, i) => (
              <AuditRow key={`${a.requestId ?? ''}-${a.createdAt}-${i}`} entry={a} />
            ))}
          </ul>
          {audit.hasNextPage && (
            <div className={styles.loadMore}>
              <Button
                variant="secondary"
                loading={audit.isFetchingNextPage}
                onClick={() => void audit.fetchNextPage()}
              >
                Ver más
              </Button>
            </div>
          )}
        </>
      )}
    </Page>
  );
}

function AuditRow({ entry: a }: { entry: AdminAuditEntry }) {
  const hasDiff = (a.before ?? null) !== null || (a.after ?? null) !== null;
  return (
    <li className={styles.auditItem}>
      <span className={styles.auditTitle}>
        {humanizeAction(a.action)} <span className={styles.flagCode}>{a.action}</span>
      </span>
      <span className={styles.auditMeta}>
        <span>{formatDateTime(a.createdAt)}</span>
        <span>{a.userEmail ?? 'Sistema'}</span>
        {a.tenantName && <span>{a.tenantName}</span>}
        {a.ip && <span>IP {a.ip}</span>}
      </span>
      {hasDiff && (
        <details>
          <summary className={styles.summary}>Ver detalle</summary>
          <div className={styles.diff}>
            {(a.before ?? null) !== null && (
              <span>
                <strong>Antes:</strong> {compactJson(a.before)}
              </span>
            )}
            {(a.after ?? null) !== null && (
              <span>
                <strong>Después:</strong> {compactJson(a.after)}
              </span>
            )}
            {a.entity && (
              <span className={styles.muted}>
                {a.entity} {a.entityUuid}
              </span>
            )}
          </div>
        </details>
      )}
    </li>
  );
}
