import { Link } from 'react-router';
import { Button, Checkbox, Icon, Notice, TextField } from '../../../core/ui';
import { useRegister, useResendVerification } from '../js/use-auth';
import { AuthLayout } from './AuthLayout';
import { PasswordField, PasswordRules } from './PasswordField';
import styles from '../css/auth.module.css';

export default function RegisterView() {
  const r = useRegister();
  if (r.registeredEmail) return <CheckEmail email={r.registeredEmail} />;

  return (
    <AuthLayout
      title="Crear cuenta"
      description="En pocos minutos sabrá cuánto le cuesta cada plato y a cuánto venderlo."
      footer={
        <p>
          ¿Ya tiene cuenta? <Link to="/login">Ingresar</Link>
        </p>
      }
    >
      <form
        noValidate
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          r.submit();
        }}
      >
        {r.formError && <Notice tone="danger" title={r.formError} />}
        <TextField
          label="Su nombre"
          autoComplete="name"
          enterKeyHint="next"
          value={r.values.name}
          onChange={(e) => r.set('name', e.target.value)}
          error={r.errors.name}
          required
          autoFocus
        />
        <TextField
          label="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          value={r.values.email}
          onChange={(e) => r.set('email', e.target.value)}
          error={r.errors.email}
          required
        />
        <PasswordField
          label="Contraseña"
          value={r.values.password}
          onChange={(v) => r.set('password', v)}
          error={r.errors.password}
          autoComplete="new-password"
        />
        <PasswordRules rules={r.rules} />
        <PasswordField
          label="Confirmar contraseña"
          value={r.values.confirm}
          onChange={(v) => r.set('confirm', v)}
          error={r.errors.confirm}
          autoComplete="new-password"
        />
        <div className={styles.terms}>
          <Checkbox
            label={
              <>
                Acepto los <Link to="/terminos">términos de uso</Link> y la{' '}
                <Link to="/privacidad">política de privacidad</Link>.
              </>
            }
            checked={r.values.accept}
            onChange={(e) => r.set('accept', e.target.checked)}
            aria-invalid={r.errors.accept ? true : undefined}
            aria-describedby={r.errors.accept ? 'accept-error' : undefined}
          />
          {r.errors.accept && (
            <p id="accept-error" className={styles.fieldError} role="alert">
              <Icon name="alert" size={16} />
              {r.errors.accept}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" block loading={r.submitting}>
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}

/** Pantalla posterior al registro: confirmar el correo, con reenvío limitado a uno por minuto. */
function CheckEmail({ email }: { email: string }) {
  const { resend, sent, error, sending, cooldown } = useResendVerification(60);
  return (
    <AuthLayout
      title="Revise su correo"
      footer={
        <p>
          ¿Ya confirmó? <Link to="/login">Ingresar</Link>
        </p>
      }
    >
      <div className={styles.form}>
        <div className={styles.mailHero} aria-hidden="true">
          <Icon name="mail" size={32} />
        </div>
        <p className={styles.lead}>
          Le enviamos un enlace de confirmación a <strong className={styles.email}>{email}</strong>.
          Ábralo para activar su cuenta.
        </p>
        <p className={styles.muted}>
          Si no lo ve en unos minutos, revise la carpeta de correo no deseado o promociones.
        </p>
        {sent && <Notice tone="positive" title="Le enviamos un correo nuevo." />}
        {error && <Notice tone="danger" title={error} />}
        <Button
          variant="secondary"
          size="lg"
          block
          icon="refresh"
          loading={sending}
          disabled={cooldown > 0}
          onClick={() => resend(email)}
        >
          {cooldown > 0 ? `Reenviar correo en ${cooldown} s` : 'Reenviar correo'}
        </Button>
      </div>
    </AuthLayout>
  );
}
