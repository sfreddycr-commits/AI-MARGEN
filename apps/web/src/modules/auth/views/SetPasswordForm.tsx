import { Link } from 'react-router';
import { Button, Icon, Notice } from '../../../core/ui';
import { useSetPassword, useTokenParam } from '../js/use-auth';
import { AuthLayout } from './AuthLayout';
import { PasswordField, PasswordRules } from './PasswordField';
import styles from '../css/auth.module.css';

const COPY = {
  reset: {
    title: 'Contraseña nueva',
    description: 'Elija una contraseña nueva para su cuenta.',
    submit: 'Guardar contraseña',
    doneTitle: 'Contraseña actualizada',
    doneText: 'Ya puede ingresar con su contraseña nueva.',
    missing: 'El enlace está incompleto o ya se usó.',
    missingAction: { to: '/recuperar', label: 'Solicitar un enlace nuevo' },
  },
  invite: {
    title: 'Únase a su equipo',
    description: 'Cree una contraseña para entrar al negocio que le invitó.',
    submit: 'Crear contraseña y unirme',
    doneTitle: '¡Listo! Ya es parte del equipo',
    doneText: 'Ingrese con su correo y la contraseña que acaba de crear.',
    missing: 'La invitación está incompleta o ya se usó.',
    missingAction: null,
  },
} as const;

/** Crear contraseña desde un enlace de correo: restablecer o aceptar invitación. */
export function SetPasswordForm({ mode }: { mode: 'reset' | 'invite' }) {
  const token = useTokenParam();
  const f = useSetPassword(mode, token);
  const copy = COPY[mode];

  if (f.done) {
    return (
      <AuthLayout title={copy.doneTitle}>
        <div className={styles.form}>
          <div className={styles.successHero} aria-hidden="true">
            <Icon name="check" size={32} />
          </div>
          <p className={styles.lead} role="status">
            {copy.doneText}
          </p>
          <Link to="/login" className={styles.primaryLink}>
            Ir a ingresar
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (!f.hasToken) {
    return (
      <AuthLayout title={copy.title}>
        <div className={styles.form}>
          <Notice tone="danger" title={copy.missing}>
            {mode === 'invite'
              ? 'Pida a la persona que le invitó que le envíe una invitación nueva.'
              : 'Solicite uno nuevo para continuar.'}
          </Notice>
          {copy.missingAction && (
            <Link to={copy.missingAction.to} className={styles.primaryLink}>
              {copy.missingAction.label}
            </Link>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={copy.title}
      description={copy.description}
      footer={
        <p>
          <Link to="/login">Volver a ingresar</Link>
        </p>
      }
    >
      <form
        noValidate
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          f.submit();
        }}
      >
        {f.formError && (
          <Notice tone="danger" title={f.formError}>
            {mode === 'reset' && <Link to="/recuperar">Solicitar un enlace nuevo</Link>}
          </Notice>
        )}
        <PasswordField
          label="Contraseña nueva"
          value={f.password}
          onChange={f.setPassword}
          error={f.errors.password}
          autoComplete="new-password"
          autoFocus
        />
        <PasswordRules rules={f.rules} />
        <PasswordField
          label="Confirmar contraseña"
          value={f.confirm}
          onChange={f.setConfirm}
          error={f.errors.confirm}
          autoComplete="new-password"
        />
        <Button type="submit" size="lg" block loading={f.submitting}>
          {copy.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}
