import { useNavigate } from 'react-router';
import {
  Button,
  Chips,
  EmptyState,
  List,
  ListRow,
  Notice,
  SearchField,
  SelectField,
  Skeleton,
  StatusBadge,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useSession, useTenant } from '../../../core/session/js/session-context';
import { formatDate, formatMoney } from '../../../core/js/format';
import { useIngredientList, type IngredientFilter } from '../js/use-ingredients';
import { moneyPerUnit } from '../js/units';
import type { Ingredient } from '../js/ingredients.service';
import styles from '../css/ingredients.module.css';

export default function IngredientsListView() {
  const navigate = useNavigate();
  const { can } = useSession();
  const { currency } = useTenant();
  const list = useIngredientList();
  const canWrite = can('ingredients.write');
  const hasAny = list.activeCount > 0 || (list.archivedCount ?? 0) > 0;

  return (
    <Page
      title="Ingredientes"
      description="Lo que compra para preparar sus productos y cuánto le cuesta cada unidad."
      back="/app/mas"
      action={
        canWrite && (
          <Button icon="plus" onClick={() => navigate('/app/ingredients/new')}>
            Nuevo
          </Button>
        )
      }
    >
      {list.error && (
        <Notice tone="danger" title="No se pudieron cargar los ingredientes">
          {list.error.message}
        </Notice>
      )}

      {(hasAny || list.filter !== 'active') && (
        <div className={styles.toolbar}>
          <SearchField
            value={list.q}
            onChange={list.setQ}
            placeholder="Buscar por nombre, categoría o proveedor"
          />
          <div className={styles.filters}>
            <Chips<IngredientFilter>
              label="Filtrar ingredientes"
              value={list.filter}
              onChange={list.setFilter}
              options={[
                { value: 'active', label: 'Activos', count: list.activeCount },
                { value: 'missing', label: 'Sin costo', count: list.missingCount },
                { value: 'archived', label: 'Archivados', count: list.archivedCount },
              ]}
            />
            {list.categories.length > 0 && (
              <SelectField
                label="Categoría"
                className={styles.categoryFilter}
                value={list.category}
                onChange={(e) => list.setCategory(e.target.value)}
                placeholder="Todas las categorías"
                options={list.categories.map((c) => ({ value: c.uuid, label: c.name }))}
              />
            )}
          </div>
        </div>
      )}

      {list.archivedError && (
        <Notice tone="warning" title="No se pudieron cargar los archivados">
          Los ingredientes archivados se consultan en línea. Revise su conexión e intente de nuevo.
        </Notice>
      )}

      {list.isPending || list.archivedPending ? (
        <List label="Cargando">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={styles.skeletonRow}>
              <Skeleton width="45%" />
              <Skeleton width="30%" height={12} />
            </li>
          ))}
        </List>
      ) : list.items.length === 0 ? (
        list.activeCount === 0 && list.filter === 'active' && !list.q ? (
          <EmptyState
            icon="ingredients"
            title="Aún no tiene ingredientes"
            description="Agregue lo que compra (harina, carne, huevos…) con su precio para calcular el costo de sus recetas."
            action={
              canWrite && (
                <Button icon="plus" onClick={() => navigate('/app/ingredients/new')}>
                  Agregar ingrediente
                </Button>
              )
            }
          />
        ) : list.filter === 'missing' && !list.q && !list.category ? (
          <p className={styles.noResults}>Todos sus ingredientes tienen costo registrado.</p>
        ) : list.filter === 'archived' && !list.q && !list.category ? (
          <p className={styles.noResults}>No tiene ingredientes archivados.</p>
        ) : (
          <p className={styles.noResults}>No hay ingredientes que coincidan.</p>
        )
      ) : (
        <List label="Ingredientes">
          {list.items.map((i) => (
            <IngredientRow key={i.uuid} i={i} currency={currency} />
          ))}
        </List>
      )}
    </Page>
  );
}

function IngredientRow({ i, currency }: { i: Ingredient; currency: string }) {
  const lowYield = i.yield !== '1' && i.effectiveUnitCost !== null;
  return (
    <ListRow
      to={`/app/ingredients/${i.uuid}`}
      icon="ingredients"
      title={i.name}
      subtitle={[i.categoryName, i.supplierName].filter(Boolean).join(' · ') || 'Sin categoría'}
      badge={
        i.unitCost === null ? (
          <StatusBadge tone="warning">Sin costo</StatusBadge>
        ) : i.isDemo ? (
          <StatusBadge tone="info">Demo</StatusBadge>
        ) : undefined
      }
      value={i.unitCost === null ? '—' : moneyPerUnit(i.unitCost, i.unit, currency)}
      valueCaption={
        lowYield
          ? `Real ${formatMoney(i.effectiveUnitCost!, currency)}`
          : i.lastCostAt
            ? formatDate(i.lastCostAt)
            : 'Registre su costo'
      }
      muted={i.archived}
    />
  );
}
