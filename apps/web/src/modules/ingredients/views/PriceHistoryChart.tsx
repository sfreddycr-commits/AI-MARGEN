import { formatDate } from '../../../core/js/format';
import type { ChartPoint } from '../js/use-ingredients';
import { moneyPerUnit } from '../js/units';
import styles from '../css/ingredients.module.css';

const W = 320;
const H = 120;
const PAD = 8;

/**
 * Gráfico de línea del costo vigente en el tiempo (SVG propio, sin librerías).
 * Solo escala los valores que entrega la API para dibujarlos; no calcula costos.
 */
export function PriceHistoryChart({
  points,
  unit,
  currency,
}: {
  points: ChartPoint[];
  unit: string;
  currency: string;
}) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || max || 1;
  const lo = max === min ? min - span / 2 : min;
  const hi = max === min ? max + span / 2 : max;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (points.length - 1);
  const y = (v: number) => PAD + (1 - (v - lo) / (hi - lo)) * (H - PAD * 2);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${H - PAD} L${x(0)},${H - PAD} Z`;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const minLabel = points.find((p) => p.value === min)!.label;
  const maxLabel = points.find((p) => p.value === max)!.label;

  return (
    <figure className={styles.chart}>
      <div className={styles.chartFrame}>
        <span className={`num ${styles.chartMax}`}>{moneyPerUnit(maxLabel, unit, currency)}</span>
        <div className={styles.chartPlot}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className={styles.chartSvg}
            role="img"
            aria-label={`Costo por ${unit}: pasó de ${moneyPerUnit(first.label, unit, currency)} el ${formatDate(first.date)} a ${moneyPerUnit(last.label, unit, currency)} el ${formatDate(last.date)}. Mínimo ${moneyPerUnit(minLabel, unit, currency)}, máximo ${moneyPerUnit(maxLabel, unit, currency)}.`}
            preserveAspectRatio="none"
          >
            <path d={area} className={styles.chartArea} />
            <path d={line} className={styles.chartLine} vectorEffect="non-scaling-stroke" />
          </svg>
          <div className={styles.chartDots} aria-hidden="true">
            {points.map((p, i) => (
              <span
                key={`${p.date}-${i}`}
                className={`${styles.chartDot} ${i === points.length - 1 ? styles.chartDotLast : ''}`}
                style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(p.value) / H) * 100}%` }}
              />
            ))}
          </div>
        </div>
        <span className={`num ${styles.chartMin}`}>{moneyPerUnit(minLabel, unit, currency)}</span>
      </div>
      <figcaption className={styles.chartAxis}>
        <span>{formatDate(first.date)}</span>
        <span>{formatDate(last.date)}</span>
      </figcaption>
    </figure>
  );
}
