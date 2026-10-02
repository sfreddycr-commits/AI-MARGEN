import { MarginBar, Icon } from '../../../core/ui';
import { formatMoney, formatPercent } from '../../../core/js/format';
import styles from '../css/mockup.module.css';

/**
 * Maqueta del producto hecha en HTML/CSS (sin fotos). Cifras ILUSTRATIVAS y coherentes entre sí:
 * ingredientes ₡1.450 + mano de obra ₡250 + indirectos ₡150 = costo ₡1.850;
 * precio ₡3.500 → utilidad ₡1.650 → margen (3500 − 1850) / 3500 = 47,1 %.
 */
const RECIPE = {
  name: 'Casado con pollo',
  cost: '1850',
  price: '3500',
  profit: '1650',
  margin: '0.4714',
  target: '0.45',
  lines: [
    { name: 'Pollo en salsa', qty: '160 g', cost: '720' },
    { name: 'Frijoles', qty: '120 g', cost: '210' },
    { name: 'Plátano maduro', qty: '1/2 unid.', cost: '190' },
    { name: 'Arroz', qty: '150 g', cost: '180' },
    { name: 'Ensalada', qty: '80 g', cost: '150' },
  ],
  labor: '250',
  overhead: '150',
};

/** Lista del "panel" (escritorio). Margen = (precio − costo) / precio, calculado a mano. */
const PRODUCTS = [
  { name: 'Casado con pollo', cost: '1850', price: '3500', margin: '0.4714' },
  { name: 'Gallo pinto con huevo', cost: '1120', price: '2500', margin: '0.552' },
  { name: 'Café chorreado', cost: '310', price: '1200', margin: '0.7417' },
  { name: 'Arroz con camarones', cost: '3900', price: '5200', margin: '0.25' },
];

const TARGET = '0.45';

export function PhoneMockup() {
  return (
    <div className={styles.phone}>
      <div className={styles.phoneNotch} aria-hidden="true" />
      <div className={styles.phoneScreen}>
        <div className={styles.phoneTop}>
          <span className={styles.phoneEyebrow}>Receta · 1 porción</span>
          <span className={styles.phoneTitle}>{RECIPE.name}</span>
        </div>

        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Costo por porción</span>
            <span className={`${styles.kpiValue} num`}>{formatMoney(RECIPE.cost)}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Precio de venta</span>
            <span className={`${styles.kpiValue} num`}>{formatMoney(RECIPE.price)}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Utilidad</span>
            <span className={`${styles.kpiValue} num`}>{formatMoney(RECIPE.profit)}</span>
          </div>
          <div className={`${styles.kpi} ${styles.kpiStrong}`}>
            <span className={styles.kpiLabel}>Margen real</span>
            <span className={`${styles.kpiValue} num`}>{formatPercent(RECIPE.margin)}</span>
          </div>
        </div>

        <MarginBar
          cost={RECIPE.cost}
          price={RECIPE.price}
          margin={RECIPE.margin}
          target={RECIPE.target}
        />
        <p className={styles.status}>
          <Icon name="check" size={16} />
          Sobre su meta de {formatPercent(RECIPE.target)}
        </p>

        <ul className={styles.lines}>
          {RECIPE.lines.map((l) => (
            <li key={l.name}>
              <span>
                {l.name} <span className={styles.qty}>{l.qty}</span>
              </span>
              <span className="num">{formatMoney(l.cost)}</span>
            </li>
          ))}
          <li className={styles.lineMuted}>
            <span>Mano de obra</span>
            <span className="num">{formatMoney(RECIPE.labor)}</span>
          </li>
          <li className={styles.lineMuted}>
            <span>Costos indirectos</span>
            <span className="num">{formatMoney(RECIPE.overhead)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function DashboardMockup() {
  return (
    <div className={styles.panel}>
      <div className={styles.panelBar} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className={styles.panelBody}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Productos</span>
          <span className={styles.panelMeta}>Meta de margen {formatPercent(TARGET)}</span>
        </div>
        <ul className={styles.rows}>
          {PRODUCTS.map((p) => {
            const below = Number(p.margin) < Number(TARGET);
            return (
              <li key={p.name} className={styles.row}>
                <div className={styles.rowTop}>
                  <span className={styles.rowName}>{p.name}</span>
                  <span className={`${styles.rowMargin} num ${below ? styles.rowLow : ''}`}>
                    {below && <Icon name="alert" size={14} />}
                    {formatPercent(p.margin)}
                  </span>
                </div>
                <MarginBar
                  cost={p.cost}
                  price={p.price}
                  margin={p.margin}
                  target={TARGET}
                  compact
                />
                <div className={styles.rowMeta}>
                  <span className="num">Costo {formatMoney(p.cost)}</span>
                  <span className="num">Precio {formatMoney(p.price)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Composición del hero: panel de escritorio detrás y teléfono al frente. */
export function ProductMockup() {
  return (
    <figure className={styles.stage}>
      <div className={styles.stagePanel}>
        <DashboardMockup />
      </div>
      <div className={styles.stagePhone}>
        <PhoneMockup />
      </div>
      <figcaption className={styles.caption}>Ejemplo ilustrativo con cifras de muestra.</figcaption>
    </figure>
  );
}
