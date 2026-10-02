import { Link } from 'react-router';
import { Button, Icon, Notice, Skeleton, TextField } from '../../../core/ui';
import { useResendForm, useTokenParam, useVerifyEmail } from '../js/use-auth';
import { AuthLayout } from './AuthLayout';
import styles from '../css/auth.module.css';

/** Enlace del correo de confirmación: se valida solo al abrirlo. */
export default function VerifyEmailView() {
  const token = useTokenParam();
  const { status, message } = useVerifyEmail(token);

  if (status === 'verifying') {
    return (
      <AuthLayout title="Confirmando su correo…">
        <div className={styles.form} role="status" aria-live="polite">
          <Skeleton height={20} />
          <Skeleton height={20} width="70%" />
          <span className="srOnly">Confirmando su correo, un momento.</span>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'success') {
    return (
      <AuthLayout title="¡Correo confirmado!">
        <div className={styles.form}>
          <div className={styles.successHero} aria-hidden="true">
            <Icon name="check" size={32} />
          </div>
          <p className={styles.lead} role="status">
            Su cuenta está activa. Ingrese para configurar su negocio y calcular su primer plato.
          </p>
          <Link to="/login" className={styles.primaryLink}>
            Ingresar
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="No pudimos confirmar su correo"
      footer={
        <p>
          ¿Ya lo había confirmado? <Link to="/login">Ingresar</Link>
        </p>
      }
    >
      <div className={styles.form}>
        <Notice tone="danger" title={message ?? 'El enlace no es válido o ya venció.'} />
        <ResendForm />
      </div>
    </AuthLayout>
  );
}

function ResendForm() {
  const f = useResendForm();
  return (
    <form
      noValidate
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        f.submit();
      }}
    >
      <p className={styles.muted}>Escriba su correo y le enviaremos un enlace nuevo.</p>
      {f.sent && (
        <Notice tone="positive" title="Revise su correo">
          Si la cuenta existe y aún no está confirmada, le llegará un enlace nuevo.
        </Notice>
      )}
      {f.requestError && <Notice tone="danger" title={f.requestError} />}
      <TextField
        label="Correo"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="send"
        value={f.email}
        onChange={(e) => f.setEmail(e.target.value)}
        error={f.error}
        required
      />
      <Button type="submit" size="lg" block loading={f.sending} disabled={f.cooldown > 0}>
        {f.cooldown > 0 ? `Reenviar en ${f.cooldown} s` : 'Reenviar enlace'}
      </Button>
    </form>
  );
}
