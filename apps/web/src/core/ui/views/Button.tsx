import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from '../css/button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  block?: boolean;
  children: ReactNode;
}

/**
 * Botón base. Alto mínimo 44 px (SOP §9). `loading` lo deshabilita y lo anuncia a lectores de pantalla.
 * Siempre `type="button"` salvo que se indique `submit`, para evitar envíos accidentales.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon,
    loading = false,
    block = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [
    styles.button,
    styles[variant],
    size === 'lg' ? styles.lg : '',
    block ? styles.block : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} size={20} />
      )}
      <span>{children}</span>
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Obligatorio: los botones de solo ícono necesitan nombre accesible. */
  label: string;
}

export function IconButton({ icon, label, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.iconButton} ${className ?? ''}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
