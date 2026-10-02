import { useState } from 'react';
import { Button, Chips, EmptyState, Notice, Skeleton } from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { formatDateTime } from '../../../core/js/format';
import { useAuditLog } from '../js/use-settings';
import type { AuditEntry } from '../js/settings.service';
import { auditDiff, entityLabel, humanizeAction } from '../js/settings-labels';
import styles from '../css/settings.module.css';

const FILTERS = [
  { value: 'all', label: 'Todo' },
  { value: 'tenant', label: 'Negocio' },
  { value: 'tenant_settings', label: 'Costeo' },
  { value: 'user', label: 'Usuarios' },
  { value: 'product', label: 'Productos' },
  { value: 'ingredient', label: 'Ingredientes' },
  { value: 'purchase', label: 'Compras' },
] as const;
type Filter = (typeof FILTERS)[number]['value'];

export default function AuditView() {
  const [filter, setFilter] = useState<Filter>('all');
  const log = useAuditLog(filter === 'all' ? undefined : filter);

  return (
    <Page
      title="Auditoría"
      description="Registro de los cambios importantes: quién los hizo y cuándo."
      back="/app/settings"
    >
      <Chips
        label="Filtrar por tipo"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
      />
      {log.error && (
        <Notice tone="danger" title="No se pudo cargar la auditoría">
          {log.error.message}
        </Notice>
      )}
      {log.isPending ? (
        <ul className={styles.auditList} aria-label="Cargando">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={`${styles.auditItem} ${styles.skeletonRow}`}>
              <Skeleton width="55%" />
              <Skeleton width="35%" height={12} />
            </li>
          ))}
        </ul>
      ) : log.items.length === 0 ? (
        <EmptyState
          icon="history"
          title="Sin movimientos"
          description="Aún no hay cambios registrados de este tipo. Pruebe con otro filtro."
          action={
            filter !== 'all' && (
              <Button variant="secondary" onClick={() => setFilter('all')}>
                Ver todo
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className={styles.auditList} aria-label="Movimientos">
            {log.items.map((a, i) => (
              <AuditItem key={`${a.createdAt}-${a.action}-${i}`} entry={a} />
            ))}
          </ul>
          {log.hasNextPage && (
            <div className={styles.loadMore}>
              <Button
                variant="secondary"
                onClick={() => void log.fetchNextPage()}
                loading={log.isFetchingNextPage}
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

function AuditItem({ entry }: { entry: AuditEntry }) {
  const hasDiff = (entry.before ?? null) !== null || (entry.after ?? null) !== null;
  const title = humanizeAction(entry.action);
  return (
    <li className={styles.auditItem}>
      <div className={styles.auditHead}>
        <span className={styles.auditTitle} title={entry.action}>
          {title}
        </span>
        <span className={styles.auditMeta}>
          <span>{entry.userName ?? 'Sistema'}</span>
          <span>{formatDateTime(entry.createdAt)}</span>
          {entry.entity && <span>{entityLabel(entry.entity)}</span>}
        </span>
      </div>
      {hasDiff && (
        <details className={styles.details}>
          <summary className={styles.summary}>Ver detalle del cambio</summary>
          <AuditDiffTable before={entry.before} after={entry.after} />
        </details>
      )}
    </li>
  );
}

function AuditDiffTable({ before, after }: { before: unknown; after: unknown }) {
  const rows = auditDiff(before, after);
  if (rows.length === 0) return <p className={styles.help}>Sin detalle.</p>;
  const onlyAfter = (before ?? null) === null;
  return (
    <div className={styles.diffWrap}>
      <table className={styles.diff}>
        <thead>
          <tr>
            <th scope="col">Campo</th>
            {!onlyAfter && <th scope="col">Antes</th>}
            <th scope="col">{onlyAfter ? 'Valor' : 'Después'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.changed && !onlyAfter ? styles.changed : undefined}>
              <th scope="row" className={r.changed && !onlyAfter ? styles.changedMark : undefined}>
                {r.key}
                {r.changed && !onlyAfter && <span className="srOnly"> (cambió)</span>}
              </th>
              {!onlyAfter && <td>{r.before}</td>}
              <td>{r.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
