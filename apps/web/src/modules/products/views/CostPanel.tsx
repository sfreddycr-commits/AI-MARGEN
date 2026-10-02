import { Button, KeyValue, MarginBar, Notice, Skeleton } from '../../../core/ui';
import { formatDecimal, formatMoney, formatPercent } from '../../../core/js/format';
import type { ProductPreview } from '../js/products.service';
import { STATUS_META } from '../js/use-products';
import { ProductStatusBadge } from './ProductStatusBadge';
import styles from '../css/products.module.css';

interface CostPanelProps {
  preview: ProductPreview | null;
  pending: boolean;
  invalid: boolean;
  error: string | null;
  hasLines: boolean;
  currency: string;
  /** Rellena el campo "precio de venta" con un precio sugerido. */
  onUsePrice?: (price: string) => void;
}

const money = (v: string | null | undefined, currency: string) =>
  v === null || v === undefined ? '—' : formatMoney(v, currency);

/** Panel de costo en vivo del editor: desglose, advertencias y precios sugeridos (todo del motor). */
export function CostPanel({
  preview,
  pending,
  invalid,
  error,
  hasLines,
  currency,
  onUsePrice,
}: CostPanelProps) {
  if (!hasLines) {
    return (
      <div className={styles.panelEmpty}>
        <p>Agregue ingredientes y verá aquí cuánto cuesta cada porción y a qué precio venderla.</p>
      </div>
    );
  }
  if (!preview) {
    return error ? (
      <Notice tone="danger" title="No se pudo calcular">
        {error}
      </Notice>
    ) : (
      <div className={styles.panelBody} aria-busy="true">
        <Skeleton width="40%" height={14} />
        <Skeleton width="60%" height={36} />
        <Skeleton height={120} radius={10} />
      </div>
    );
  }

  const b = preview.breakdown;
  const a = preview.analysis;
  const status = preview.pricing.status;
  const current = a?.current;
  const hasPrice =
    current?.price !== null && current?.price !== undefined && Number(current.price) > 0;
  const warnings = b.warnings;

  return (
    <div className={`${styles.panelBody} ${pending ? styles.panelPending : ''}`} aria-live="polite">
      <div className={styles.panelHead}>
        <div className={styles.panelHeadMain}>
          <span className={styles.panelLabel}>Costo por porción</span>
          <span className={`num ${styles.panelBig}`}>{money(b.costPerPortion, currency)}</span>
        </div>
        <ProductStatusBadge status={status} />
      </div>
      {invalid && (
        <p className={styles.panelHint}>Corrija los valores marcados para actualizar el cálculo.</p>
      )}
      {error && (
        <Notice tone="danger" title="No se pudo actualizar el cálculo">
          {error}
        </Notice>
      )}

      {warnings.length > 0 && (
        <Notice tone="warning" title="Cálculo incompleto">
          <ul className={styles.warnList}>
            {warnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>{w.message}</li>
            ))}
          </ul>
          <p>{STATUS_META.incomplete.explain}</p>
        </Notice>
      )}

      <div>
        <KeyValue label="Ingredientes" value={money(b.ingredientsCost, currency)} />
        {Number(b.packagingCost) > 0 && (
          <KeyValue label="Empaque" value={money(b.packagingCost, currency)} />
        )}
        {Number(b.laborCost) > 0 && (
          <KeyValue label="Mano de obra" value={money(b.laborCost, currency)} />
        )}
        {Number(b.overheadCost) > 0 && (
          <KeyValue label="Indirectos" value={money(b.overheadCost, currency)} />
        )}
        {Number(b.wasteCost) > 0 && <KeyValue label="Merma" value={money(b.wasteCost, currency)} />}
        <KeyValue label="Costo total de la receta" value={money(b.totalCost, currency)} strong />
      </div>

      {hasPrice && current && b.costPerPortion !== null && current.margin !== null && (
        <div className={styles.panelSection}>
          <div className={styles.panelPriceRow}>
            <span>
              <span className={styles.panelLabel}>Su precio</span>
              <span className={`num ${styles.panelMid}`}>{money(current.price, currency)}</span>
            </span>
            <span className={styles.alignRight}>
              <span className={styles.panelLabel}>Ganancia por porción</span>
              <span
                className={`num ${styles.panelMid} ${Number(current.profit) < 0 ? styles.loss : ''}`}
              >
                {money(current.profit, currency)}
              </span>
            </span>
          </div>
          <MarginBar
            cost={b.costPerPortion}
            price={current.price!}
            margin={current.margin}
            target={preview.effectiveTargetMargin}
            currency={currency}
          />
        </div>
      )}

      {a?.byMargin?.price && (
        <div className={styles.suggestion}>
          <div className={styles.suggestionMain}>
            <span className={styles.panelLabel}>
              Precio sugerido para {formatPercent(preview.effectiveTargetMargin ?? '0')} de margen
            </span>
            <span className={`num ${styles.panelMid}`}>{money(a.byMargin.price, currency)}</span>
            {a.equivalentMultiplier && (
              <span className={styles.suggestionNote}>
                Equivale a multiplicar el costo × {formatDecimal(a.equivalentMultiplier, 2)}
              </span>
            )}
          </div>
          {onUsePrice && (
            <Button variant="secondary" onClick={() => onUsePrice(a.byMargin!.price!)}>
              Usar
            </Button>
          )}
        </div>
      )}
      {a?.byMultiplier?.price && (
        <div className={styles.suggestion}>
          <div className={styles.suggestionMain}>
            <span className={styles.panelLabel}>Precio con su multiplicador</span>
            <span className={`num ${styles.panelMid}`}>
              {money(a.byMultiplier.price, currency)}
            </span>
            {a.multiplierMargin && (
              <span className={styles.suggestionNote}>
                Deja un margen de {formatPercent(a.multiplierMargin)}
              </span>
            )}
          </div>
          {onUsePrice && (
            <Button variant="secondary" onClick={() => onUsePrice(a.byMultiplier!.price!)}>
              Usar
            </Button>
          )}
        </div>
      )}
      {a?.warnings
        .filter((w) => w.code === 'MULTIPLIER_BELOW_ONE')
        .map((w) => (
          <Notice key={w.code} tone="warning" title={w.message} />
        ))}
    </div>
  );
}
