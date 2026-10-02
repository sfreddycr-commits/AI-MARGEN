import { useId, useState } from 'react';
import { Icon, TextField } from '../../../core/ui';
import type { PasswordRule } from '../js/use-auth';
import styles from '../css/auth.module.css';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  autoComplete: 'current-password' | 'new-password';
  autoFocus?: boolean;
}

/** Contraseña con botón mostrar/ocultar (SOP §7). */
export function PasswordField({
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
  autoFocus,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      label={label}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      hint={hint}
      autoComplete={autoComplete}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      autoFocus={autoFocus}
      required
      suffix={
        <button
          type="button"
          className={styles.reveal}
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <Icon name={visible ? 'lock' : 'eye'} size={20} />
        </button>
      }
    />
  );
}

/** Reglas de la contraseña con su estado (ícono + texto, no solo color). */
export function PasswordRules({ rules }: { rules: PasswordRule[] }) {
  const id = useId();
  return (
    <div className={styles.rules}>
      <p id={id} className={styles.rulesTitle}>
        Su contraseña necesita:
      </p>
      <ul aria-labelledby={id} className={styles.rulesList}>
        {rules.map((r) => (
          <li key={r.label} className={r.met ? styles.ruleMet : styles.rule}>
            <Icon name={r.met ? 'check' : 'info'} size={16} />
            <span>{r.label}</span>
            <span className="srOnly">{r.met ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
