import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon, MarginBar } from '../../../core/ui';
import { formatMoney } from '../../../core/js/format';
import { Brand } from './Brand';
import styles from '../css/auth.module.css';

/** Mensajes de valor (SOP §2) para el panel lateral. */
const VALUE_POINTS = [
  'Costo real de cada receta, con el precio de su última compra.',
  'Precio sugerido según el margen que usted quiere ganar.',
  'Margen y utilidad claros, plato por plato.',
];

/** Producto de ejemplo para ilustrar la barra de margen (datos fijos de muestra). */
const SAMPLE = {
  name: 'Casado con pollo',
  cost: '1750',
  price: '3500',
  margin: '0.5',
  target: '0.35',
};

interface AuthLayoutProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Enlaces secundarios bajo el formulario (ir a registro, volver al ingreso…). */
  footer?: ReactNode;
}

/**
 * Pantallas de acceso. Móvil: una columna con la marca arriba.
 * Escritorio: pantalla dividida con un panel de valor en azul profundo.
 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  useEffect(() => {
    document.title = `${title} | AImargen`;
  }, [title]);

  return (
    <div className={styles.layout}>
      <aside className={styles.panel} aria-label="Qué es AImargen">
        <Link to="/login" className={styles.panelBrand} aria-label="AImargen, ir al ingreso">
          <Brand tone="light" />
        </Link>
        <div className={styles.panelBody}>
          <p className={styles.claim}>
            Sepa cuánto cuesta.
            <br />
            Sepa cuánto gana.
          </p>
          <figure className={styles.sample}>
            <figcaption className={styles.sampleHead}>
              <span className={styles.sampleName}>{SAMPLE.name}</span>
              <span className={styles.samplePrice}>
                <span className={styles.sampleLabel}>Precio</span>
                <span className="num">{formatMoney(SAMPLE.price, 'CRC')}</span>
              </span>
            </figcaption>
            <MarginBar
              cost={SAMPLE.cost}
              price={SAMPLE.price}
              margin={SAMPLE.margin}
              target={SAMPLE.target}
            />
            <p className={styles.sampleNote}>
              <Icon name="check" size={16} />
              Por encima de su meta de 35 %
            </p>
          </figure>
          <ul className={styles.points}>
            {VALUE_POINTS.map((p) => (
              <li key={p}>
                <span className={styles.pointIcon} aria-hidden="true">
                  <Icon name="check" size={16} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.panelFoot}>
          Hecho para restaurantes, sodas y cafeterías de Costa Rica.
        </p>
      </aside>

      <main className={styles.main} id="contenido">
        <div className={styles.column}>
          <div className={styles.mobileBrand}>
            <Brand />
          </div>
          <header className={styles.header}>
            <h1 className={styles.title}>{title}</h1>
            {description && <p className={styles.description}>{description}</p>}
          </header>
          {children}
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </main>
    </div>
  );
}
