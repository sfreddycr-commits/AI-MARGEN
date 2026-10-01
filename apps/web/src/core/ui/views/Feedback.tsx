import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from '../css/feedback.module.css';

/** Placeholder de carga con la forma del contenido (SOP §9: skeletons). */
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
}: {
  width?: string | number;
  height?: number;
  radius?: number;
}) {
  return (
    <span
      className={styles.skeleton}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  /** La acción concreta que resuelve el vacío. */
  action?: ReactNode;
}

/** Estado vacío: una invitación a actuar, no un mensaje de ánimo. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <section className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} size={28} />
      </span>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyText}>{description}</p>
      {action}
    </section>
  );
}

type Tone = 'positive' | 'warning' | 'danger' | 'neutral' | 'info';
const TONE_ICON: Record<Tone, IconName> = {
  positive: 'check',
  warning: 'alert',
  danger: 'alert',
  neutral: 'info',
  info: 'info',
};

/** Estado con ícono + texto, nunca solo color (SOP §32). */
export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      <Icon name={TONE_ICON[tone]} size={14} />
      {children}
    </span>
  );
}

/** Aviso en línea (errores de carga, advertencias). */
export function Notice({
  tone,
  title,
  children,
  action,
}: {
  tone: Exclude<Tone, 'neutral'>;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={`${styles.notice} ${styles[tone]}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon name={TONE_ICON[tone]} size={20} />
      <div className={styles.noticeBody}>
        <p className={styles.noticeTitle}>{title}</p>
        {children && <div className={styles.noticeText}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
