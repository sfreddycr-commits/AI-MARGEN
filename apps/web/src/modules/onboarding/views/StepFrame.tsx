import type { FormEvent, ReactNode } from 'react';
import { Button, Notice } from '../../../core/ui';
import styles from '../css/onboarding.module.css';

interface StepFrameProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
  /** Texto del botón principal (envía el formulario). */
  submitLabel: string;
  submitting?: boolean;
  onSubmit: () => void;
  onBack?: () => void;
  /** Acción secundaria "Omitir este paso". */
  onSkip?: () => void;
  formError?: string | null;
}

/** Marco común de cada paso: título, formulario y una sola acción principal fija abajo en móvil. */
export function StepFrame({
  title,
  description,
  children,
  submitLabel,
  submitting,
  onSubmit,
  onBack,
  onSkip,
  formError,
}: StepFrameProps) {
  return (
    <form
      noValidate
      className={styles.step}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <header className={styles.stepHeader}>
        <h1 className={styles.stepTitle} tabIndex={-1}>
          {title}
        </h1>
        <p className={styles.stepDescription}>{description}</p>
      </header>
      {formError && <Notice tone="danger" title={formError} />}
      <div className={styles.stepBody}>{children}</div>
      <div className={styles.stepActions}>
        {onBack && (
          <Button
            variant="secondary"
            size="lg"
            icon="chevronLeft"
            onClick={onBack}
            disabled={submitting}
            className={styles.backButton}
          >
            Atrás
          </Button>
        )}
        {onSkip && (
          <Button variant="ghost" size="lg" onClick={onSkip} disabled={submitting}>
            Omitir
          </Button>
        )}
        <Button type="submit" size="lg" loading={submitting} className={styles.primaryButton}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
