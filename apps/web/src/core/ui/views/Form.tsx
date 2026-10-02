import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from './Icon';
import fieldStyles from '../css/field.module.css';
import styles from '../css/form.module.css';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (describedBy: string | undefined) => ReactNode;
}

/** Envoltura común: etiqueta visible, ayuda y error asociados por aria-describedby. */
function FieldShell({ id, label, hint, error, className, children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`${fieldStyles.field} ${className ?? ''}`}>
      <label htmlFor={id} className={fieldStyles.label}>
        {label}
      </label>
      {children(describedBy)}
      {hint && !error && (
        <p id={hintId} className={fieldStyles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={fieldStyles.error} role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  /** Texto de la opción vacía; si se omite no hay opción vacía. */
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, options, placeholder, id, className, ...rest },
  ref,
) {
  const auto = useId();
  const sid = id ?? auto;
  return (
    <FieldShell id={sid} label={label} hint={hint} error={error} className={className}>
      {(describedBy) => (
        <div className={`${fieldStyles.control} ${styles.selectControl} ${error ? fieldStyles.invalid : ''}`}>
          <select
            ref={ref}
            id={sid}
            className={styles.select}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...rest}
          >
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={18} className={styles.selectIcon} />
        </div>
      )}
    </FieldShell>
  );
});

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, hint, error, id, className, rows = 3, ...rest }, ref) {
    const auto = useId();
    const tid = id ?? auto;
    return (
      <FieldShell id={tid} label={label} hint={hint} error={error} className={className}>
        {(describedBy) => (
          <textarea
            ref={ref}
            id={tid}
            rows={rows}
            className={`${styles.textarea} ${error ? fieldStyles.invalid : ''}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...rest}
          />
        )}
      </FieldShell>
    );
  },
);

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: string;
}

/** Casilla con área táctil completa. */
export function Checkbox({ label, description, className, id, ...rest }: CheckboxProps) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <label htmlFor={cid} className={`${styles.check} ${className ?? ''}`}>
      <input id={cid} type="checkbox" className={styles.checkInput} {...rest} />
      <span className={styles.checkBox} aria-hidden="true">
        <Icon name="check" size={16} />
      </span>
      <span className={styles.checkText}>
        <span>{label}</span>
        {description && <span className={styles.checkDescription}>{description}</span>}
      </span>
    </label>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  /** Oculta la etiqueta visualmente (sigue disponible para lectores). */
  hideLabel?: boolean;
}

/** Control segmentado (2–4 opciones excluyentes). */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  hideLabel,
}: SegmentedProps<T>) {
  const id = useId();
  return (
    <div className={styles.segmentedWrap}>
      <span id={id} className={hideLabel ? 'srOnly' : fieldStyles.label}>
        {label}
      </span>
      <div className={styles.segmented} role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={`${styles.segment} ${value === o.value ? styles.segmentActive : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Campo de búsqueda para listados. */
export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar',
  label = 'Buscar',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className={styles.search} role="search">
      <Icon name="search" size={18} className={styles.searchIcon} />
      <input
        type="search"
        aria-label={label}
        className={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        enterKeyHint="search"
      />
    </div>
  );
}

/** Rejilla de formulario: una columna en móvil, dos en pantallas anchas. */
export function FormGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 | 3 }) {
  return <div className={`${styles.grid} ${styles[`cols${columns}`]}`}>{children}</div>;
}
