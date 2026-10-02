import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Actions,
  Button,
  Card,
  ConfirmSheet,
  Icon,
  KeyValue,
  Notice,
  Skeleton,
  Stat,
  StatusBadge,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { useSession, useTenant } from '../../../core/session/js/session-context';
import { errorMessage } from '../../../core/js/api-client';
import { formatDate, formatDecimal, formatPercent, unitLabel } from '../../../core/js/format';
import {
  SOURCE_LABELS,
  useArchiveIngredient,
  useIngredient,
  useIngredientHistory,
  type HistoryRow,
} from '../js/use-ingredients';
import { UNIT_NAMES, UNIT_SINGULAR, moneyPerUnit } from '../js/units';
import type { Ingredient } from '../js/ingredients.service';
import { CostSheet } from './CostSheet';
import { PriceHistoryChart } from './PriceHistoryChart';
import styles from '../css/ingredients.module.css';

export default function IngredientDetailView() {
  const { uuid } = useParams();
  const { data: i, isPending, error } = useIngredient(uuid);
  if (isPending) return <PageSkeleton />;
  if (error || !i) {
    return (
      <Page title="Ingrediente" back="/app/ingredients">
        <Notice tone="danger" title="No se encontró el ingrediente">
          {error?.message}
        </Notice>
      </Page>
    );
  }
  return <IngredientDetail i={i} />;
}

function IngredientDetail({ i }: { i: Ingredient }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useSession();
  const { currency } = useTenant();
  const history = useIngredientHistory(i.uuid);
  const archive = useArchiveIngredient();
  const [confirm, setConfirm] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const canWrite = can('ingredients.write') && !i.archived;
  const hasYieldLoss = i.yield !== '1';

  const toggleArchive = () =>
    archive.mutate(
      { uuid: i.uuid, archived: !i.archived },
      {
        onSuccess: () => {
          setConfirm(false);
          toast.show(i.archived ? 'Ingrediente restaurado' : 'Ingrediente archivado');
        },
        onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
      },
    );

  return (
    <Page
      title={i.name}
      back="/app/ingredients"
      action={
        canWrite && (
          <Button icon="plus" onClick={() => setCostOpen(true)}>
            Registrar costo
          </Button>
        )
      }
    >
      {i.archived && (
        <Notice tone="warning" title="Ingrediente archivado">
          No aparece al registrar compras ni al armar recetas. Puede restaurarlo cuando quiera.
        </Notice>
      )}
      {i.unitCost === null && !i.archived && (
        <Notice tone="warning" title="Sin costo registrado">
          Las recetas que lo usan quedan incompletas. Registre una compra o un costo para
          completarlas.
        </Notice>
      )}

      <div className={styles.stats}>
        <Stat
          label={`Costo por ${UNIT_SINGULAR[i.unit] ?? unitLabel(i.unit)}`}
          value={i.unitCost === null ? '—' : moneyPerUnit(i.unitCost, i.unit, currency)}
          caption={i.lastCostAt ? `Actualizado ${formatDate(i.lastCostAt)}` : 'Sin costo'}
        />
        {hasYieldLoss && (
          <Stat
            label="Costo real aprovechable"
            value={
              i.effectiveUnitCost === null
                ? '—'
                : moneyPerUnit(i.effectiveUnitCost, i.unit, currency)
            }
            caption={`Rendimiento ${formatPercent(i.yield)}`}
          />
        )}
        <Stat
          label="Se usa en"
          value={i.usedInProducts === 1 ? '1 producto' : `${i.usedInProducts} productos`}
          caption={
            i.usedInProducts > 0 ? (
              <Link to={`/app/products?ingredient=${i.uuid}`}>Ver productos</Link>
            ) : (
              'Aún no está en recetas'
            )
          }
        />
      </div>

      <div className={styles.detailGrid}>
        <Card
          title="Datos"
          action={
            canWrite && (
              <Button
                variant="ghost"
                icon="edit"
                onClick={() => navigate(`/app/ingredients/${i.uuid}/edit`)}
              >
                Editar
              </Button>
            )
          }
        >
          <div>
            <KeyValue label="Categoría" value={i.categoryName ?? 'Sin categoría'} />
            <KeyValue label="Unidad base" value={UNIT_NAMES[i.unit] ?? i.unit} />
            <KeyValue
              label="Rendimiento"
              hint="Lo aprovechable después de limpiar o pelar"
              value={formatPercent(i.yield)}
            />
            <KeyValue
              label="Proveedor actual"
              value={
                i.supplierUuid ? (
                  <Link to={`/app/suppliers/${i.supplierUuid}`}>{i.supplierName}</Link>
                ) : (
                  '—'
                )
              }
            />
            {i.conversions.map((c) => (
              <KeyValue
                key={`${c.from}-${c.to}`}
                label="Equivalencia"
                value={`1 ${unitLabel(c.from)} = ${formatDecimal(c.factor, 2).replace(/,00$/, '')} ${unitLabel(c.to)}`}
              />
            ))}
          </div>
          {i.notes && <p className={styles.notes}>{i.notes}</p>}
          {i.isDemo && <StatusBadge tone="info">Dato de demostración</StatusBadge>}
        </Card>

        <Card
          title="Historial de precios"
          action={
            <Button
              variant="ghost"
              icon="purchases"
              onClick={() => navigate(`/app/purchases?ingredient=${i.uuid}`)}
            >
              Compras
            </Button>
          }
        >
          {history.isPending ? (
            <div className={styles.stack}>
              <Skeleton height={120} radius={8} />
              <Skeleton width="60%" />
              <Skeleton width="40%" />
            </div>
          ) : history.error ? (
            <Notice tone="danger" title="No se pudo cargar el historial">
              {history.error.message}
            </Notice>
          ) : history.rows.length === 0 ? (
            <p className={styles.help}>
              Todavía no hay precios registrados. Cada compra o costo que registre aparecerá aquí.
            </p>
          ) : (
            <>
              <PriceHistoryChart points={history.points} unit={i.unit} currency={currency} />
              <ol className={styles.history} aria-label="Precios registrados">
                {history.rows.map((h) => (
                  <HistoryItem key={h.key} h={h} unit={i.unit} currency={currency} />
                ))}
              </ol>
            </>
          )}
        </Card>
      </div>

      {can('ingredients.write') && (
        <Actions>
          <Button
            variant="ghost"
            icon={i.archived ? 'restore' : 'archive'}
            onClick={() => (i.archived ? toggleArchive() : setConfirm(true))}
            loading={archive.isPending && i.archived}
          >
            {i.archived ? 'Restaurar ingrediente' : 'Archivar ingrediente'}
          </Button>
        </Actions>
      )}

      {canWrite && (
        <CostSheet
          open={costOpen}
          onClose={() => setCostOpen(false)}
          ingredient={i}
          currency={currency}
        />
      )}
      <ConfirmSheet
        open={confirm}
        title="¿Archivar ingrediente?"
        message={
          <>
            {i.usedInProducts > 0 && (
              <Notice
                tone="warning"
                title={`Se usa en ${i.usedInProducts === 1 ? '1 producto' : `${i.usedInProducts} productos`}`}
              >
                Esas recetas lo conservan, pero no podrá agregarlo a recetas ni compras nuevas.
              </Notice>
            )}
            <p>Su historial de precios se conserva. Puede restaurarlo cuando quiera.</p>
          </>
        }
        confirmLabel="Archivar"
        danger
        loading={archive.isPending}
        onConfirm={toggleArchive}
        onClose={() => setConfirm(false)}
      />
    </Page>
  );
}

function HistoryItem({ h, unit, currency }: { h: HistoryRow; unit: string; currency: string }) {
  const up = h.change !== null && !h.change.startsWith('-') && h.change !== '0';
  const down = h.change !== null && h.change.startsWith('-');
  return (
    <li className={`${styles.historyRow} ${h.voided ? styles.voided : ''}`}>
      <div className={styles.historyMain}>
        <span className={`num ${styles.historyCost}`}>
          {moneyPerUnit(h.unitCost, unit, currency)}
        </span>
        <span className={styles.historyMeta}>
          {formatDate(h.effectiveAt)} · {SOURCE_LABELS[h.source] ?? h.source}
          {h.supplierName ? ` · ${h.supplierName}` : ''}
        </span>
      </div>
      <div className={styles.historySide}>
        {h.voided ? (
          <StatusBadge tone="danger">Anulado</StatusBadge>
        ) : up || down ? (
          <span className={`num ${styles.change} ${up ? styles.changeUp : styles.changeDown}`}>
            <Icon name={up ? 'trendUp' : 'trendDown'} size={16} />
            {up ? 'Subió ' : 'Bajó '}
            {formatPercent(up ? h.change! : h.change!.slice(1))}
          </span>
        ) : h.change === '0' ? (
          <span className={styles.historyMeta}>Sin cambio</span>
        ) : null}
        {h.purchaseUuid && (
          <Link to={`/app/purchases/${h.purchaseUuid}`} className={styles.historyLink}>
            Ver compra
          </Link>
        )}
      </div>
    </li>
  );
}
