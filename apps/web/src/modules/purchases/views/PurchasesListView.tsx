import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Actions,
  Button,
  Chips,
  EmptyState,
  FormGrid,
  Icon,
  List,
  ListRow,
  Notice,
  SelectField,
  Sheet,
  Skeleton,
  StatusBadge,
  TextField,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useSession, useTenant } from '../../../core/session/js/session-context';
import { useLocalItem } from '../../../core/data/js/use-entity';
import { formatDate, formatMoney } from '../../../core/js/format';
import { usePurchaseFilters, usePurchaseList, useSupplierOptions } from '../js/use-purchases';
import type { Ingredient } from '../../ingredients/js/ingredients.service';
import styles from '../css/purchases.module.css';

export default function PurchasesListView() {
  const navigate = useNavigate();
  const { can } = useSession();
  const { currency } = useTenant();
  const { filters, update, activeCount } = usePurchaseFilters();
  const list = usePurchaseList(filters);
  const suppliers = useSupplierOptions();
  const ingredient = useLocalItem<Ingredient>(
    'ingredients',
    filters.ingredient,
    `/ingredients/${filters.ingredient}`,
  );
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState({ supplier: '', from: '', to: '' });
  const canWrite = can('purchases.write');
  const supplierName = suppliers.find((s) => s.value === filters.supplier)?.label;
  const filtered = activeCount > 0 || !!filters.ingredient;

  const openFilters = () => {
    setDraft({
      supplier: filters.supplier ?? '',
      from: filters.from ?? '',
      to: filters.to ?? '',
    });
    setSheet(true);
  };

  return (
    <Page
      title="Compras"
      description="Cada compra actualiza el costo de sus ingredientes y recalcula sus recetas."
      back="/app/mas"
      action={
        canWrite && (
          <Button
            icon="plus"
            onClick={() =>
              navigate(
                filters.supplier
                  ? `/app/purchases/new?supplier=${filters.supplier}`
                  : '/app/purchases/new',
              )
            }
          >
            Nueva compra
          </Button>
        )
      }
    >
      <div className={styles.toolbar}>
        <Chips<'current' | 'all'>
          label="Mostrar compras"
          value={filters.includeVoid ? 'all' : 'current'}
          onChange={(v) => update({ void: v === 'all' ? '1' : null })}
          options={[
            { value: 'current', label: 'Vigentes' },
            { value: 'all', label: 'Incluir anuladas' },
          ]}
        />
        <Button variant="secondary" icon="filter" onClick={openFilters}>
          {activeCount > 0 ? `Filtros (${activeCount})` : 'Filtros'}
        </Button>
      </div>

      {filtered && (
        <div className={styles.activeFilters} aria-label="Filtros aplicados">
          {filters.supplier && (
            <FilterTag
              label={`Proveedor: ${supplierName ?? '…'}`}
              onRemove={() => update({ supplier: null })}
            />
          )}
          {filters.ingredient && (
            <FilterTag
              label={`Ingrediente: ${ingredient.data?.name ?? '…'}`}
              onRemove={() => update({ ingredient: null })}
            />
          )}
          {(filters.from || filters.to) && (
            <FilterTag
              label={`Fechas: ${filters.from ? formatDate(filters.from) : 'inicio'} – ${filters.to ? formatDate(filters.to) : 'hoy'}`}
              onRemove={() => update({ from: null, to: null })}
            />
          )}
        </div>
      )}

      {list.error && (
        <Notice
          tone="danger"
          title="No se pudieron cargar las compras"
          action={
            <Button variant="secondary" onClick={() => void list.refetch()}>
              Reintentar
            </Button>
          }
        >
          {list.error.message}
        </Notice>
      )}

      {list.isPending ? (
        <List label="Cargando">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={styles.skeletonRow}>
              <Skeleton width="40%" />
              <Skeleton width="65%" height={12} />
            </li>
          ))}
        </List>
      ) : list.items.length === 0 && !list.error ? (
        filtered ? (
          <p className={styles.noResults}>No hay compras con estos filtros.</p>
        ) : (
          <EmptyState
            icon="purchases"
            title="Aún no ha registrado compras"
            description="Registre lo que compró con su precio: el costo de sus ingredientes y recetas se actualiza solo."
            action={
              canWrite && (
                <Button icon="plus" onClick={() => navigate('/app/purchases/new')}>
                  Registrar compra
                </Button>
              )
            }
          />
        )
      ) : (
        <>
          <p className={styles.count}>{list.total === 1 ? '1 compra' : `${list.total} compras`}</p>
          <List label="Compras">
            {list.items.map((p) => (
              <ListRow
                key={p.uuid}
                to={`/app/purchases/${p.uuid}`}
                icon="purchases"
                title={p.supplierName ?? 'Sin proveedor'}
                subtitle={p.itemsSummary || 'Sin detalle'}
                badge={
                  p.voided || p.source === 'invoice_ai' ? (
                    <>
                      {p.voided && <StatusBadge tone="danger">Anulada</StatusBadge>}
                      {p.source === 'invoice_ai' && (
                        <StatusBadge tone="info">Factura IA</StatusBadge>
                      )}
                    </>
                  ) : undefined
                }
                value={p.total === null ? '—' : formatMoney(p.total, currency)}
                valueCaption={formatDate(p.purchasedAt)}
                muted={p.voided}
              />
            ))}
          </List>
          {list.hasNextPage && (
            <div className={styles.loadMore}>
              <Button
                variant="secondary"
                loading={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
              >
                Cargar más
              </Button>
            </div>
          )}
        </>
      )}

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Filtrar compras"
        footer={
          <Actions>
            <Button
              variant="secondary"
              onClick={() => {
                update({ supplier: null, from: null, to: null });
                setSheet(false);
              }}
            >
              Limpiar
            </Button>
            <Button
              onClick={() => {
                update({
                  supplier: draft.supplier || null,
                  from: draft.from || null,
                  to: draft.to || null,
                });
                setSheet(false);
              }}
            >
              Aplicar
            </Button>
          </Actions>
        }
      >
        <FormGrid columns={1}>
          <SelectField
            label="Proveedor"
            value={draft.supplier}
            onChange={(e) => setDraft((d) => ({ ...d, supplier: e.target.value }))}
            placeholder="Todos los proveedores"
            options={suppliers}
          />
          <TextField
            label="Desde"
            type="date"
            value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
          />
          <TextField
            label="Hasta"
            type="date"
            value={draft.to}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
          />
        </FormGrid>
      </Sheet>
    </Page>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className={styles.filterTag}>
      <span className={styles.filterTagText}>{label}</span>
      <button
        type="button"
        className={styles.filterTagRemove}
        onClick={onRemove}
        aria-label={`Quitar filtro ${label}`}
      >
        <Icon name="close" size={16} />
      </button>
    </span>
  );
}
