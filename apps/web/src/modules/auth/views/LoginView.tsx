import { Link } from 'react-router';
import { Button, Checkbox, Notice, TextField } from '../../../core/ui';
import { useLogin, useResendVerification } from '../js/use-auth';
import { AuthLayout } from './AuthLayout';
import { PasswordField } from './PasswordField';
import styles from '../css/auth.module.css';

export default function LoginView() {
  const { values, set, errors, problem, submit, submitting } = useLogin();

  return (
    <AuthLayout
      title="Ingresar"
      description="Sepa cuánto cuesta. Sepa cuánto gana."
      footer={
        <p>
          ¿Aún no tiene cuenta? <Link to="/registro">Crear cuenta gratis</Link>
        </p>
      }
    >
      <form
        noValidate
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {problem?.kind === 'unverified' && (
          <UnverifiedNotice email={values.email} message={problem.message} />
        )}
        {problem?.kind === 'locked' && (
          <Notice tone="warning" title="Cuenta bloqueada por seguridad">
            {problem.message} <Link to="/recuperar">Recuperar contraseña</Link>
          </Notice>
        )}
        {problem?.kind === 'other' && <Notice tone="danger" title={problem.message} />}

        <TextField
          label="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
          required
          autoFocus
        />
        <PasswordField
          label="Contraseña"
          value={values.password}
          onChange={(v) => set('password', v)}
          error={errors.password}
          autoComplete="current-password"
        />
        <div className={styles.row}>
          <Checkbox
            label="Recordarme"
            description="Mantener la sesión 30 días en este dispositivo."
            checked={values.remember}
            onChange={(e) => set('remember', e.target.checked)}
          />
        </div>
        <Button type="submit" size="lg" block loading={submitting}>
          Ingresar
        </Button>
        <p className={styles.centered}>
          <Link to="/recuperar" className={styles.link}>
            ¿Olvidó su contraseña?
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function UnverifiedNotice({ email, message }: { email: string; message: string }) {
  const { resend, sent, error, sending, cooldown } = useResendVerification();
  return (
    <Notice tone="warning" title="Falta confirmar su correo">
      <p>{message}</p>
      {sent && <p role="status">Le enviamos un correo nuevo a {email}.</p>}
      {error && <p role="alert">{error}</p>}
      <Button
        variant="secondary"
        icon="mail"
        className={styles.noticeButton}
        loading={sending}
        disabled={cooldown > 0}
        onClick={() => resend(email.trim())}
      >
        {cooldown > 0 ? `Reenviar en ${cooldown} s` : 'Reenviar correo'}
      </Button>
    </Notice>
  );
}
