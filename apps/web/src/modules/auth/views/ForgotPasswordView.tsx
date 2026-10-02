import { Link } from 'react-router';
import { Button, Icon, Notice, TextField } from '../../../core/ui';
import { useForgotPassword } from '../js/use-auth';
import { AuthLayout } from './AuthLayout';
import styles from '../css/auth.module.css';

export default function ForgotPasswordView() {
  const f = useForgotPassword();
  const footer = (
    <p>
      <Link to="/login">Volver a ingresar</Link>
    </p>
  );

  if (f.sentTo) {
    return (
      <AuthLayout title="Revise su correo" footer={footer}>
        <div className={styles.form}>
          <div className={styles.mailHero} aria-hidden="true">
            <Icon name="mail" size={32} />
          </div>
          <p className={styles.lead} role="status">
            Si existe una cuenta con <strong className={styles.email}>{f.sentTo}</strong>, le
            enviamos un enlace para crear una contraseña nueva.
          </p>
          <p className={styles.muted}>
            El enlace vence pronto. Si no lo ve, revise la carpeta de correo no deseado.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      description="Escriba el correo con el que ingresa y le enviaremos un enlace para crear una contraseña nueva."
      footer={footer}
    >
      <form
        noValidate
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          f.submit();
        }}
      >
        {f.formError && <Notice tone="danger" title={f.formError} />}
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
          autoFocus
        />
        <Button type="submit" size="lg" block loading={f.submitting}>
          Enviar enlace
        </Button>
      </form>
    </AuthLayout>
  );
}
