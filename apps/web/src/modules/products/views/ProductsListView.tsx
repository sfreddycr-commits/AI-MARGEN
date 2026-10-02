import { Link, useNavigate } from 'react-router';
import {
  Button,
  Chips,
  EmptyState,
  Icon,
  List,
  MarginBar,
  Notice,
  SearchField,
  Skeleton,
  StatusBadge,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useSession, useTenant } from '../../../core/session/js/session-context';
import { formatMoney, formatPercent } from '../../../core/js/format';
import { useProductList, type StatusFilter } from '../js/use-products';
import type { Product } from '../js/products.service';
import { ProductStatusBadge } from './ProductStatusBadge';
import styles from '../css/products.module.css';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  below_cost: 'Bajo costo',
  below_target: 'Bajo objetivo',
  no_price: 'Sin precio',
  incomplete: 'Incompletos',
  archived: 'Archivados',
};

export default function ProductsListView() {
  const navigate = useNavigate();
  const { can } = useSession();
  const list = useProductList();
  const canWrite = can('products.write');

  const statusOptions = (Object.keys(STATUS_LABELS) as StatusFilter[])
    .filter((s) => s === 'all' || s === list.status || list.counts[s] > 0)
    .map((s) => ({ value: s, label: STATUS_LABELS[s], count: list.counts[s] }));

  const categoryOptions = [
    { value: 'all', label: 'Todas las categorías' },
    ...list.categories.map((c) => ({ value: c.uuid, label: c.name })),
  ];

  return (
    <Page
      title="Productos"
      description="Sus recetas con costo por porción, precio y margen al día."
      action={
        canWrite && (
          <Button icon="plus" onClick={() => navigate('/app/products/new')}>
            Nuevo producto
          </Button>
        )
      }
    >
      {list.error && (
        <Notice tone="danger" title="No se pudieron cargar los productos">
          {list.error.message}
        </Notice>
      )}

      {list.totalAll > 0 && (
        <div className={styles.toolbar}>
          <SearchField value={list.q} onChange={list.setQ} placeholder="Buscar producto" />
          {list.categories.length > 0 && (
            <Chips
              label="Filtrar por categoría"
              value={list.category}
              onChange={list.setCategory}
              options={categoryOptions}
            />
          )}
          <Chips
            label="Filtrar por estado"
            value={list.status}
            onChange={list.setStatus}
            options={statusOptions}
          />
        </div>
      )}

      {list.isPending ? (
        <List label="Cargando">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={styles.skeletonRow}>
              <Skeleton width="50%" />
              <Skeleton width="30%" height={12} />
              <Skeleton height={6} />
            </li>
          ))}
        </List>
      ) : list.items.length === 0 ? (
        list.totalAll === 0 ? (
          <EmptyState
            icon="products"
            title="Aún no tiene productos"
            description="Cree su primera receta: elija los ingredientes y AImargen le dice cuánto le cuesta cada porción y a qué precio venderla."
            action={
              canWrite && (
                <Button icon="plus" onClick={() => navigate('/app/products/new')}>
                  Crear primera receta
                </Button>
              )
            }
          />
        ) : (
          <div className={styles.noResults}>
            <p>No hay productos que coincidan con la búsqueda o el filtro.</p>
            <Button
              variant="ghost"
              onClick={() => {
                list.setQ('');
                list.setStatus('all');
                list.setCategory('all');
              }}
            >
              Ver todos
            </Button>
          </div>
        )
      ) : (
        <List label="Productos">
          {list.items.map((p) => (
            <ProductRow key={p.uuid} p={p} />
          ))}
        </List>
      )}
    </Page>
  );
}

function ProductRow({ p }: { p: Product }) {
  const { currency } = useTenant();
  const hasPrice = p.currentPrice !== null && Number(p.currentPrice) > 0;
  const margin = p.pricing.margin;
  return (
    <li>
      <Link
        to={`/app/products/${p.uuid}`}
        className={`${styles.row} ${p.archived ? styles.muted : ''}`}
      >
        <span className={styles.rowTop}>
          <span className={styles.rowName}>{p.name}</span>
          <span className={`num ${styles.rowPrice}`}>
            {hasPrice ? formatMoney(p.currentPrice!, currency) : 'Sin precio'}
          </span>
        </span>
        <span className={styles.rowMeta}>
          {p.archived ? (
            <StatusBadge tone="neutral">Archivado</StatusBadge>
          ) : (
            <ProductStatusBadge status={p.pricing.status} />
          )}
          {p.categoryName && <span className={styles.rowCategory}>{p.categoryName}</span>}
          <span className={`num ${styles.rowCost}`}>
            Costo/porción{' '}
            {p.costPerPortion !== null ? formatMoney(p.costPerPortion, currency) : '—'}
          </span>
        </span>
        {hasPrice && margin !== null && p.costPerPortion !== null && (
          <span className={styles.rowMargin}>
            <span className={styles.rowBar}>
              <MarginBar
                compact
                cost={p.costPerPortion}
                price={p.currentPrice!}
                margin={margin}
                target={p.effectiveTargetMargin}
                currency={currency}
              />
            </span>
            <span
              className={`num ${styles.rowMarginValue} ${Number(margin) < 0 ? styles.loss : ''}`}
            >
              {formatPercent(margin)}
            </span>
          </span>
        )}
        <Icon name="chevronRight" size={18} className={styles.rowChevron} />
      </Link>
    </li>
  );
}
