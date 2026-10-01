import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon } from './Icon';
import styles from '../css/field.module.css';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label: string;
  hint?: string;
  error?: string;
  /** Contenido fijo antes del valor, ej. "₡". */
  prefix?: ReactNode;
  suffix?: ReactNode;
}

/**
 * Campo de texto con etiqueta visible, ayuda y error asociados por aria-describedby.
 * El error se anuncia con ícono y texto (no solo color).
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, prefix, suffix, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`${styles.field} ${className ?? ''}`}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.control} ${error ? styles.invalid : ''}`}>
        {prefix && <span className={styles.affix}>{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {suffix && <span className={styles.affix}>{suffix}</span>}
      </div>
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  );
});

interface NumberFieldProps extends Omit<TextFieldProps, 'type' | 'inputMode'> {
  /** 'money' muestra el símbolo de moneda; 'percent' muestra %. */
  kind?: 'money' | 'quantity' | 'percent';
  currencySymbol?: string;
}

/**
 * Campo numérico con teclado decimal en móvil (SOP §9). Acepta formato local ("1.500,75");
 * la lectura a string decimal la hace `parseLocaleDecimal` en la capa js del módulo.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { kind = 'quantity', currencySymbol = '₡', prefix, suffix, ...rest },
  ref,
) {
  return (
    <TextField
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      enterKeyHint="next"
      prefix={prefix ?? (kind === 'money' ? currencySymbol : undefined)}
      suffix={suffix ?? (kind === 'percent' ? '%' : undefined)}
      className={styles.numeric}
      {...rest}
    />
  );
});
