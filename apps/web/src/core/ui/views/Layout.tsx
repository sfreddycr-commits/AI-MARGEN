import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';
import { Sheet } from './Sheet';
import styles from '../css/layout.module.css';

/** Tarjeta de contenido. `title` opcional con acción secundaria a la derecha. */
export function Card({
  title,
  action,
  children,
  padded = true,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
}) {
  return (
    <section className={`${styles.card} ${padded ? styles.padded : ''} ${className ?? ''}`}>
      {(title || action) && (
        <header className={styles.cardHeader}>
          {title && <h2 className={styles.cardTitle}>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Lista de filas táctiles (patrón móvil principal para listados). */
export function List({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul className={styles.list} aria-label={label}>
      {children}
    </ul>
  );
}

interface ListRowProps {
  to?: string;
  onClick?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Valor principal a la derecha (monto, margen…). */
  value?: ReactNode;
  valueCaption?: ReactNode;
  icon?: IconName;
  badge?: ReactNode;
  muted?: boolean;
}

export function ListRow({
  to,
  onClick,
  title,
  subtitle,
  value,
  valueCaption,
  icon,
  badge,
  muted,
}: ListRowProps) {
  const content = (
    <>
      {icon && (
        <span className={styles.rowIcon}>
          <Icon name={icon} size={20} />
        </span>
      )}
      <span className={styles.rowMain}>
        <span className={styles.rowTitle}>{title}</span>
        {(subtitle || badge) && (
          <span className={styles.rowSubtitle}>
            {badge}
            {subtitle && <span>{subtitle}</span>}
          </span>
        )}
      </span>
      {(value !== undefined || valueCaption) && (
        <span className={styles.rowValue}>
          {value !== undefined && <span className={`num ${styles.rowAmount}`}>{value}</span>}
          {valueCaption && <span className={styles.rowCaption}>{valueCaption}</span>}
        </span>
      )}
      {(to || onClick) && <Icon name="chevronRight" size={18} className={styles.rowChevron} />}
    </>
  );
  const cls = `${styles.row} ${muted ? styles.muted : ''}`;
  return (
    <li>
      {to ? (
        <Link to={to} className={cls}>
          {content}
        </Link>
      ) : onClick ? (
        <button type="button" className={`${cls} ${styles.rowButton}`} onClick={onClick}>
          {content}
        </button>
      ) : (
        <div className={cls}>{content}</div>
      )}
    </li>
  );
}

/** Indicador clave: cifra grande + etiqueta + contexto. */
export function Stat({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  tone?: 'positive' | 'warning' | 'danger';
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`num ${styles.statValue} ${tone ? styles[tone] : ''}`}>{value}</span>
      {caption && <span className={styles.statCaption}>{caption}</span>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.statGrid}>{children}</div>;
}

/** Fila etiqueta / valor para desgloses (costos, totales). */
export function KeyValue({
  label,
  value,
  strong,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  hint?: ReactNode;
}) {
  return (
    <div className={`${styles.kv} ${strong ? styles.kvStrong : ''}`}>
      <span className={styles.kvLabel}>
        {label}
        {hint && <span className={styles.kvHint}>{hint}</span>}
      </span>
      <span className="num">{value}</span>
    </div>
  );
}

/** Tabla simple con desplazamiento horizontal en pantallas angostas. */
export function DataTable({
  columns,
  rows,
  caption,
}: {
  columns: Array<{ key: string; label: string; align?: 'left' | 'right' }>;
  rows: Array<Record<string, ReactNode> & { key: string }>;
  caption?: string;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        {caption && <caption className="srOnly">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.align === 'right' ? styles.right : ''}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? `num ${styles.right}` : ''}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Confirmación para acciones destructivas o sensibles. */
export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className={styles.confirmText}>{message}</div>
    </Sheet>
  );
}

/** Contenedor de acciones al pie de un formulario. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

/** Fila de filtros horizontales desplazables (chips). */
export function Chips<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  label: string;
}) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          className={`${styles.chip} ${value === o.value ? styles.chipActive : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className={`num ${styles.chipCount}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
