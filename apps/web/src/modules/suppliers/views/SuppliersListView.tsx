import { useNavigate } from 'react-router';
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
import { useSession } from '../../../core/session/js/session-context';
import { formatDate } from '../../../core/js/format';
import { useSupplierList } from '../js/use-suppliers';
import styles from '../css/suppliers.module.css';

export default function SuppliersListView() {
  const navigate = useNavigate();
  const { can } = useSession();
  const list = useSupplierList();
  const canWrite = can('suppliers.write');
  const total = list.data?.filter((s) => !s.archived).length ?? 0;

  return (
    <Page
      title="Proveedores"
      description="A quién le compra y a qué precio. Cada compra queda ligada a su proveedor."
      back="/app/mas"
      action={
        canWrite && (
          <Button icon="plus" onClick={() => navigate('/app/suppliers/new')}>
            Nuevo
          </Button>
        )
      }
    >
      {list.error && (
        <Notice tone="danger" title="No se pudieron cargar los proveedores">
          {list.error.message}
        </Notice>
      )}

      {(total > 0 || list.archivedCount > 0) && (
        <div className={styles.toolbar}>
          <SearchField
            value={list.q}
            onChange={list.setQ}
            placeholder="Buscar por nombre o contacto"
          />
          <Chips
            label="Filtrar proveedores"
            value={list.showArchived ? 'archived' : 'active'}
            onChange={(v) => list.setShowArchived(v === 'archived')}
            options={[
              { value: 'active', label: 'Activos', count: total },
              { value: 'archived', label: 'Archivados', count: list.archivedCount },
            ]}
          />
        </div>
      )}

      {list.isPending ? (
        <List label="Cargando">
          {[0, 1, 2].map((i) => (
            <li key={i} className={styles.skeletonRow}>
              <Skeleton width="45%" />
              <Skeleton width="25%" height={12} />
            </li>
          ))}
        </List>
      ) : list.items.length === 0 ? (
        total === 0 && !list.showArchived ? (
          <EmptyState
            icon="suppliers"
            title="Aún no tiene proveedores"
            description="Regístrelos para comparar precios y saber a quién le compra cada ingrediente."
            action={
              canWrite && (
                <Button icon="plus" onClick={() => navigate('/app/suppliers/new')}>
                  Agregar proveedor
                </Button>
              )
            }
          />
        ) : (
          <p className={styles.noResults}>No hay proveedores que coincidan.</p>
        )
      ) : (
        <List label="Proveedores">
          {list.items.map((s) => (
            <ListRow
              key={s.uuid}
              to={`/app/suppliers/${s.uuid}`}
              icon="suppliers"
              title={s.name}
              subtitle={
                [s.contactName, s.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'
              }
              badge={s.isDemo ? <StatusBadge tone="info">Demo</StatusBadge> : undefined}
              value={s.purchasesCount === 1 ? '1 compra' : `${s.purchasesCount} compras`}
              valueCaption={
                s.lastPurchaseAt ? `Última: ${formatDate(s.lastPurchaseAt)}` : 'Sin compras'
              }
              muted={s.archived}
            />
          ))}
        </List>
      )}
    </Page>
  );
}
