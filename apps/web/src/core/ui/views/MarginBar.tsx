import { formatMoney, formatPercent } from '../../js/format';
import styles from '../css/margin-bar.module.css';

interface MarginBarProps {
  /** Costo por unidad (string decimal). */
  cost: string;
  /** Precio de venta (string decimal). */
  price: string;
  /** Margen real ya calculado por el motor (fracción string). La UI no lo calcula. */
  margin: string;
  /** Margen objetivo (fracción string) para marcar la meta en la barra. */
  target?: string | null;
  currency?: string;
  compact?: boolean;
}

/**
 * Barra de margen: el elemento distintivo de AImargen.
 * Muestra cuánto del precio es costo y cuánto es margen, con la meta como referencia.
 * Las proporciones se toman del margen calculado por el motor (no se recalcula aquí).
 */
export function MarginBar({
  cost,
  price,
  margin,
  target,
  currency = 'CRC',
  compact = false,
}: MarginBarProps) {
  const m = Number(margin);
  const negative = m < 0;
  const marginPct = Math.max(0, Math.min(100, m * 100));
  const targetPct = target ? Math.max(0, Math.min(100, Number(target) * 100)) : null;
  const belowTarget = targetPct !== null && marginPct < targetPct;

  const status = negative
    ? 'Precio por debajo del costo'
    : belowTarget
      ? 'Margen debajo del objetivo'
      : 'Margen saludable';

  return (
    <figure className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <div
        className={styles.bar}
        role="img"
        aria-label={`Precio ${formatMoney(price, currency)}: costo ${formatMoney(cost, currency)}, margen ${formatPercent(margin)}. ${status}.`}
      >
        <span
          className={`${styles.cost} ${negative ? styles.loss : ''}`}
          style={{ width: `${100 - marginPct}%` }}
        />
        <span
          className={`${styles.margin} ${negative ? styles.loss : belowTarget ? styles.low : ''}`}
          style={{ width: `${marginPct}%` }}
        />
        {targetPct !== null && (
          <span className={styles.target} style={{ right: `${targetPct}%` }} aria-hidden="true" />
        )}
      </div>
      {!compact && (
        <figcaption className={styles.legend}>
          <span>
            <span className={styles.label}>Costo</span>
            <span className="num">{formatMoney(cost, currency)}</span>
          </span>
          <span className={styles.right}>
            <span className={styles.label}>Margen</span>
            <span className={`num ${negative ? styles.lossText : ''}`}>
              {formatPercent(margin)}
            </span>
          </span>
        </figcaption>
      )}
    </figure>
  );
}
