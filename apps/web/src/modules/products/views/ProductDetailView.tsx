import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Actions,
  Button,
  Card,
  ConfirmSheet,
  Icon,
  KeyValue,
  MarginBar,
  Notice,
  NumberField,
  Sheet,
  Stat,
  StatGrid,
  StatusBadge,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { useSession, useTenant } from '../../../core/session/js/session-context';
import { errorMessage } from '../../../core/js/api-client';
import {
  currencySymbol,
  formatDateTime,
  formatDecimal,
  formatMoney,
  formatPercent,
  unitLabel,
} from '../../../core/js/format';
import {
  STATUS_META,
  useArchiveProduct,
  useDownloadSheet,
  useDuplicateProduct,
  usePriceDraft,
  useProductDetail,
  useSetPrice,
} from '../js/use-products';
import type { ProductDetail } from '../js/products.service';
import { ProductStatusBadge } from './ProductStatusBadge';
import styles from '../css/products.module.css';

const money = (v: string | null | undefined, currency: string) =>
  v === null || v === undefined ? '—' : formatMoney(v, currency);

export default function ProductDetailView() {
  const { uuid } = useParams();
  const { data: p, isPending, error } = useProductDetail(uuid);
  if (isPending) return <PageSkeleton />;
  if (error || !p) {
    return (
      <Page title="Producto" back="/app/products">
        <Notice tone="danger" title="No se encontró el producto">
          {error?.message}
        </Notice>
      </Page>
    );
  }
  return <Detail p={p} />;
}

function Detail({ p }: { p: ProductDetail }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useSession();
  const { currency } = useTenant();
  const canWrite = can('products.write') && !p.archived;
  const canPrice = can('pricing.write') && !p.archived;
  const archive = useArchiveProduct();
  const setPrice = useSetPrice();
  const sheet = useDownloadSheet();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);

  const a = p.analysis;
  const b = p.breakdown;
  const status = p.pricing.status;
  const meta = STATUS_META[status];
  const hasPrice = p.currentPrice !== null && Number(p.currentPrice) > 0;
  const current = a?.current ?? null;

  const applyPrice = (price: string, label: string) =>
    setPrice.mutate(
      { product: p, price },
      {
        onSuccess: () =>
          toast.show(`Precio actualizado a ${formatMoney(price, currency)} (${label})`),
        onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
      },
    );

  const toggleArchive = () =>
    archive.mutate(
      { uuid: p.uuid, archived: !p.archived },
      {
        onSuccess: () => {
          setConfirmArchive(false);
          toast.show(p.archived ? 'Producto restaurado' : 'Producto archivado');
        },
        onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
      },
    );

  const engineWarnings = b.warnings;

  return (
    <Page
      title={p.name}
      back="/app/products"
      action={
        canWrite && (
          <Button
            variant="secondary"
            icon="edit"
            onClick={() => navigate(`/app/products/${p.uuid}/edit`)}
          >
            Editar
          </Button>
        )
      }
    >
      {p.archived && (
        <Notice tone="warning" title="Producto archivado">
          No aparece en listados ni reportes. Puede restaurarlo cuando quiera.
        </Notice>
      )}

      <section className={styles.hero} aria-label="Rentabilidad">
        <div className={styles.heroTop}>
          <ProductStatusBadge status={status} />
          {p.categoryName && <span className={styles.rowCategory}>{p.categoryName}</span>}
          {p.isDemo && <StatusBadge tone="info">Demostración</StatusBadge>}
        </div>
        <StatGrid>
          <Stat
            label="Precio de venta"
            value={hasPrice ? money(p.currentPrice, currency) : 'Sin precio'}
          />
          <Stat
            label="Costo por porción"
            value={money(p.costPerPortion, currency)}
            caption={`Rinde ${formatDecimal(p.portions, 2).replace(/,00$/, '')} porciones`}
          />
          <Stat
            label="Ganancia por porción"
            value={hasPrice ? money(current?.profit, currency) : '—'}
            tone={
              hasPrice && current?.profit !== null && Number(current?.profit) < 0
                ? 'danger'
                : undefined
            }
          />
          <Stat
            label="Margen"
            value={hasPrice && current?.margin ? formatPercent(current.margin) : '—'}
            caption={
              p.effectiveTargetMargin
                ? `Objetivo ${formatPercent(p.effectiveTargetMargin)}${p.targetMargin ? '' : ' (del negocio)'}`
                : 'Sin margen objetivo'
            }
            tone={
              status === 'below_cost'
                ? 'danger'
                : status === 'below_target'
                  ? 'warning'
                  : status === 'healthy'
                    ? 'positive'
                    : undefined
            }
          />
        </StatGrid>
        {hasPrice && current?.margin && p.costPerPortion !== null && (
          <MarginBar
            cost={p.costPerPortion}
            price={p.currentPrice!}
            margin={current.margin}
            target={p.effectiveTargetMargin}
            currency={currency}
          />
        )}
        <p className={styles.heroExplain}>
          <Icon name={status === 'healthy' ? 'check' : 'info'} size={18} />
          <span>
            {meta.explain}
            {status === 'below_target' && a?.byMargin?.price && (
              <> Precio sugerido: {formatMoney(a.byMargin.price, currency)}.</>
            )}
          </span>
        </p>
        {canPrice && (
          <div className={styles.heroActions}>
            <Button variant="secondary" icon="edit" onClick={() => setPriceOpen(true)}>
              Cambiar precio
            </Button>
          </div>
        )}
      </section>

      {engineWarnings.length > 0 && (
        <Notice tone="warning" title="El costo está incompleto">
          <ul className={styles.warnList}>
            {engineWarnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>
                {w.message}{' '}
                {w.ref && (w.code === 'MISSING_COST' || w.code === 'INCOMPATIBLE_UNITS') && (
                  <Link to={`/app/ingredients/${w.ref}`} className={styles.inlineLink}>
                    {w.code === 'MISSING_COST' ? 'Registrar costo' : 'Revisar ingrediente'}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <div className={styles.detailGrid}>
        <PricingOptions
          p={p}
          canApply={canPrice}
          applying={setPrice.isPending}
          onApply={applyPrice}
        />

        <Card title="Desglose del costo">
          <div>
            <KeyValue label="Ingredientes" value={money(b.ingredientsCost, currency)} />
            <KeyValue
              label="Empaque"
              hint={componentHint(p.packaging)}
              value={money(b.packagingCost, currency)}
            />
            <KeyValue
              label="Mano de obra"
              hint={componentHint(p.labor)}
              value={money(b.laborCost, currency)}
            />
            <KeyValue
              label="Indirectos"
              hint={componentHint(p.overhead)}
              value={money(b.overheadCost, currency)}
            />
            <KeyValue
              label="Merma"
              hint={
                Number(p.wastePct) > 0 ? `${formatPercent(p.wastePct)} de ingredientes` : undefined
              }
              value={money(b.wasteCost, currency)}
            />
            <KeyValue
              label="Costo total de la receta"
              value={money(b.totalCost, currency)}
              strong
            />
            <KeyValue
              label="Costo por porción"
              hint={`Total ÷ ${formatDecimal(p.portions, 2).replace(/,00$/, '')} porciones`}
              value={money(b.costPerPortion, currency)}
              strong
            />
          </div>
          {p.costedAt && <p className={styles.muted}>Costos al {formatDateTime(p.costedAt)}</p>}
        </Card>

        <Card title={`Ingredientes (${b.items.length})`}>
          {b.items.length === 0 ? (
            <p className={styles.muted}>Esta receta aún no tiene ingredientes.</p>
          ) : (
            <ul className={styles.ingList}>
              {b.items.map((it, i) => (
                <li key={`${it.ingredientUuid}-${i}`} className={styles.ingRow}>
                  <span className={styles.ingMain}>
                    <Link to={`/app/ingredients/${it.ingredientUuid}`} className={styles.ingName}>
                      {it.ingredientName}
                    </Link>
                    <span className={styles.ingMeta}>
                      <span className="num">
                        {formatDecimal(it.quantity ?? '0', 3).replace(/,?0+$/, '')}{' '}
                        {unitLabel(it.unit)}
                      </span>
                      {it.unitCost !== null && (
                        <span className="num">
                          {' · '}
                          {formatMoney(it.unitCost, currency)}/{unitLabel(it.ingredientUnit)}
                        </span>
                      )}
                      {it.yield && Number(it.yield) < 1 && (
                        <span> · rendimiento {formatPercent(it.yield)}</span>
                      )}
                    </span>
                    {it.archived && <StatusBadge tone="warning">Ingrediente archivado</StatusBadge>}
                  </span>
                  <span className={`num ${styles.ingCost}`}>
                    {it.cost !== null ? (
                      formatMoney(it.cost, currency)
                    ) : (
                      <span className={styles.lineMissing}>
                        <Icon name="alert" size={16} /> Sin costo
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {p.notes && (
          <Card title="Notas">
            <p className={styles.notes}>{p.notes}</p>
          </Card>
        )}
      </div>

      <Card title="Más acciones">
        <div className={styles.moreActions}>
          {can('scenarios.read') && !p.archived && (
            <Button
              variant="secondary"
              icon="scenarios"
              onClick={() => navigate(`/app/scenarios/new?product=${p.uuid}`)}
            >
              Simular escenario
            </Button>
          )}
          {can('reports.export') && (
            <Button
              variant="secondary"
              icon="download"
              loading={sheet.isPending}
              onClick={() =>
                sheet.mutate(p.uuid, {
                  onSuccess: () => toast.show('Ficha descargada'),
                  onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
                })
              }
            >
              Ficha PDF
            </Button>
          )}
          {canWrite && (
            <Button variant="secondary" icon="copy" onClick={() => setDupOpen(true)}>
              Duplicar
            </Button>
          )}
          {can('products.write') && (
            <Button
              variant="ghost"
              icon={p.archived ? 'restore' : 'archive'}
              loading={archive.isPending && p.archived}
              onClick={() => (p.archived ? toggleArchive() : setConfirmArchive(true))}
            >
              {p.archived ? 'Restaurar producto' : 'Archivar'}
            </Button>
          )}
        </div>
      </Card>

      <ConfirmSheet
        open={confirmArchive}
        title="¿Archivar producto?"
        message={
          <p>
            “{p.name}” dejará de aparecer en sus listados, reportes y en Precio y margen. Su receta
            se conserva y puede restaurarlo cuando quiera.
          </p>
        }
        confirmLabel="Archivar"
        danger
        loading={archive.isPending}
        onConfirm={toggleArchive}
        onClose={() => setConfirmArchive(false)}
      />
      <DuplicateSheet p={p} open={dupOpen} onClose={() => setDupOpen(false)} />
      <ChangePriceSheet p={p} open={priceOpen} onClose={() => setPriceOpen(false)} />
    </Page>
  );
}

function componentHint(c: { mode: string; value: string }): string | undefined {
  if (Number(c.value) === 0) return undefined;
  return c.mode === 'percent'
    ? `${formatPercent(c.value)} de ingredientes`
    : 'Monto fijo por receta';
}

function PricingOptions({
  p,
  canApply,
  applying,
  onApply,
}: {
  p: ProductDetail;
  canApply: boolean;
  applying: boolean;
  onApply: (price: string, label: string) => void;
}) {
  const { currency } = useTenant();
  const a = p.analysis;
  const byMargin = a?.byMargin;
  const byMult = a?.byMultiplier;
  const isCurrent = (price: string | null | undefined) =>
    !!price && !!p.currentPrice && price === p.currentPrice;
  const diff = a?.differenceToRecommended;

  return (
    <Card title="Opciones de precio">
      {!a ? (
        <p className={styles.muted}>
          Cuando la receta tenga ingredientes con costo verá aquí los precios sugeridos.
        </p>
      ) : (
        <div className={styles.options}>
          <div className={styles.option}>
            <div className={styles.optionHead}>
              <span className={styles.optionTitle}>Precio por margen objetivo</span>
              {p.effectiveTargetMargin && (
                <span className={styles.optionTag}>{formatPercent(p.effectiveTargetMargin)}</span>
              )}
            </div>
            {byMargin?.price ? (
              <>
                <span className={`num ${styles.optionPrice}`}>
                  {money(byMargin.price, currency)}
                </span>
                <span className={styles.optionNote}>
                  Ganancia {money(byMargin.profit, currency)} por porción
                  {a.equivalentMultiplier &&
                    ` · equivale a costo × ${formatDecimal(a.equivalentMultiplier, 2)}`}
                </span>
                {diff && Number(diff) !== 0 && hasValue(p.currentPrice) && (
                  <span className={styles.optionNote}>
                    {Number(diff) > 0
                      ? `${formatMoney(diff, currency)} más que su precio actual`
                      : `${formatMoney(diff.replace('-', ''), currency)} menos que su precio actual`}
                  </span>
                )}
                {canApply &&
                  (isCurrent(byMargin.price) ? (
                    <StatusBadge tone="positive">Es su precio actual</StatusBadge>
                  ) : (
                    <Button
                      variant="primary"
                      loading={applying}
                      onClick={() => onApply(byMargin.price!, 'por margen')}
                    >
                      Aplicar este precio
                    </Button>
                  ))}
              </>
            ) : (
              <span className={styles.optionNote}>
                Defina un margen objetivo en la receta o en Configuración.
              </span>
            )}
          </div>

          <div className={styles.option}>
            <div className={styles.optionHead}>
              <span className={styles.optionTitle}>Precio por multiplicador</span>
              {p.multiplier && (
                <span className={styles.optionTag}>× {formatDecimal(p.multiplier, 2)}</span>
              )}
            </div>
            {byMult?.price ? (
              <>
                <span className={`num ${styles.optionPrice}`}>{money(byMult.price, currency)}</span>
                <span className={styles.optionNote}>
                  Ganancia {money(byMult.profit, currency)} · deja un margen de{' '}
                  {formatPercent(a.multiplierMargin ?? byMult.margin ?? '0')}
                </span>
                {canApply &&
                  (isCurrent(byMult.price) ? (
                    <StatusBadge tone="positive">Es su precio actual</StatusBadge>
                  ) : (
                    <Button
                      variant="secondary"
                      loading={applying}
                      onClick={() => onApply(byMult.price!, 'por multiplicador')}
                    >
                      Aplicar este precio
                    </Button>
                  ))}
              </>
            ) : (
              <span className={styles.optionNote}>
                No ha definido un multiplicador. Si acostumbra fijar precios multiplicando el costo
                (ej. × 3), agréguelo al editar la receta.
              </span>
            )}
          </div>
        </div>
      )}
      <MarginVsMultiplier />
    </Card>
  );
}

const hasValue = (v: string | null) => v !== null && Number(v) > 0;

/** Explicación fija (SOP §17): margen ≠ multiplicador. */
export function MarginVsMultiplier() {
  return (
    <div className={styles.explain}>
      <Icon name="info" size={18} />
      <p>
        <strong>Margen no es lo mismo que multiplicador.</strong> El margen es la parte del precio
        que le queda de ganancia; el multiplicador es cuántas veces cobra el costo. Multiplicar el
        costo × 3 deja un margen de 66,7%, no de 300%; y un margen de 50% equivale a × 2.
      </p>
    </div>
  );
}

function DuplicateSheet({
  p,
  open,
  onClose,
}: {
  p: ProductDetail;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(`${p.name} (copia)`);
  const dup = useDuplicateProduct((copy) => {
    onClose();
    toast.show('Producto duplicado');
    navigate(`/app/products/${copy.uuid}`);
  });
  const submit = () => dup.duplicate(p.uuid, name);
  return (
    <Sheet
      open={open}
      onClose={() => {
        dup.reset();
        onClose();
      }}
      title="Duplicar producto"
      footer={
        <Actions>
          <Button variant="secondary" onClick={onClose} disabled={dup.saving}>
            Cancelar
          </Button>
          <Button icon="copy" loading={dup.saving} onClick={submit}>
            Duplicar
          </Button>
        </Actions>
      }
    >
      <form
        noValidate
        className={styles.sheetForm}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className={styles.muted}>
          Se crea una copia independiente con la misma receta, costos adicionales y precio. Los
          cambios en la copia no afectan el original.
        </p>
        <TextField
          label="Nombre de la copia"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={dup.error ?? undefined}
          autoFocus
        />
      </form>
    </Sheet>
  );
}

function ChangePriceSheet({
  p,
  open,
  onClose,
}: {
  p: ProductDetail;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const { currency } = useTenant();
  const draft = usePriceDraft(p, open);
  const setPrice = useSetPrice();
  const a = draft.analysis;
  const submit = () => {
    if (draft.price === null) {
      draft.setError('Ingrese el nuevo precio.');
      return;
    }
    if (!/^\d{1,12}(\.\d{1,6})?$/.test(draft.price)) {
      draft.setError('Ingrese un número válido mayor o igual a cero.');
      return;
    }
    setPrice.mutate(
      { product: p, price: draft.price },
      {
        onSuccess: () => {
          toast.show(`Precio actualizado a ${formatMoney(draft.price!, currency)}`);
          draft.setValue('');
          onClose();
        },
        onError: (e) => draft.setError(errorMessage(e)),
      },
    );
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cambiar precio"
      footer={
        <Actions>
          <Button variant="secondary" onClick={onClose} disabled={setPrice.isPending}>
            Cancelar
          </Button>
          <Button loading={setPrice.isPending} onClick={submit}>
            Guardar precio
          </Button>
        </Actions>
      }
    >
      <form
        noValidate
        className={styles.sheetForm}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className={styles.muted}>
          Precio actual: {hasValue(p.currentPrice) ? money(p.currentPrice, currency) : 'sin precio'}{' '}
          · costo por porción {money(p.costPerPortion, currency)}
        </p>
        <NumberField
          kind="money"
          currencySymbol={currencySymbol(currency).trim()}
          label="Nuevo precio de venta"
          value={draft.value}
          onChange={(e) => draft.setValue(e.target.value)}
          error={draft.error ?? undefined}
          autoFocus
        />
        {a?.current?.margin && p.costPerPortion && (
          <div className={styles.sheetPreview} aria-live="polite">
            <KeyValue label="Ganancia por porción" value={money(a.current.profit, currency)} />
            <MarginBar
              cost={p.costPerPortion}
              price={a.current.price ?? '0'}
              margin={a.current.margin}
              target={p.effectiveTargetMargin}
              currency={currency}
            />
            {a.warnings
              .filter((w) => w.code === 'PRICE_BELOW_COST' || w.code === 'MARGIN_BELOW_TARGET')
              .map((w) => (
                <Notice
                  key={w.code}
                  tone={w.code === 'PRICE_BELOW_COST' ? 'danger' : 'warning'}
                  title={w.message}
                />
              ))}
          </div>
        )}
      </form>
    </Sheet>
  );
}
