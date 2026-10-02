import { useState } from 'react';
import {
  Actions,
  Button,
  Card,
  FormGrid,
  KeyValue,
  Notice,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useSession } from '../../../core/session/js/session-context';
import { ROLE_LABELS } from '../../../core/session/js/session-types';
import { formatDateTime } from '../../../core/js/format';
import { useChangePassword, useSignOut, type PasswordFormValues } from '../js/use-settings';
import styles from '../css/settings.module.css';

const EMPTY: PasswordFormValues = { currentPassword: '', newPassword: '', confirm: '' };

export default function AccountView() {
  const toast = useToast();
  const { me } = useSession();
  const signOut = useSignOut();
  const [values, setValues] = useState<PasswordFormValues>(EMPTY);
  const [leaving, setLeaving] = useState(false);
  const pwd = useChangePassword(() => {
    // La API cierra la sesión al cambiar la contraseña: se vuelve a entrar con la nueva.
    toast.show('Contraseña cambiada. Inicie sesión con su nueva contraseña.', {
      durationMs: 8000,
    });
    void signOut();
  });
  const set = (k: keyof PasswordFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  if (!me) return null;
  const { user } = me;

  return (
    <Page title="Mi cuenta" back={me.tenant ? '/app/settings' : '/app/admin'}>
      <div className={styles.formLayout}>
        <div className={styles.stack}>
          <Card title="Perfil">
            <div className={styles.profile}>
              <span className={styles.avatar} aria-hidden="true">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className={styles.profileText}>
                <span className={styles.profileName}>{user.name}</span>
                <span className={styles.muted}>{user.email}</span>
              </span>
            </div>
            <div>
              <KeyValue label="Rol" value={ROLE_LABELS[user.role] ?? user.role} />
              {me.tenant && <KeyValue label="Negocio" value={me.tenant.name} />}
              <KeyValue label="Último ingreso" value={formatDateTime(user.lastLoginAt)} />
            </div>
            <p className={styles.help}>
              Para cambiar su nombre o correo, pídaselo al dueño del negocio o escríbanos a soporte.
            </p>
          </Card>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              pwd.submit(values);
            }}
          >
            <Card title="Cambiar contraseña">
              {pwd.formError && <Notice tone="danger" title={pwd.formError} />}
              <FormGrid columns={1}>
                <TextField
                  label="Contraseña actual"
                  type="password"
                  autoComplete="current-password"
                  value={values.currentPassword}
                  onChange={set('currentPassword')}
                  error={pwd.errors.currentPassword}
                />
                <TextField
                  label="Contraseña nueva"
                  type="password"
                  autoComplete="new-password"
                  hint="Al menos 8 caracteres, con letras y números."
                  value={values.newPassword}
                  onChange={set('newPassword')}
                  error={pwd.errors.newPassword}
                />
                <TextField
                  label="Repita la contraseña nueva"
                  type="password"
                  autoComplete="new-password"
                  value={values.confirm}
                  onChange={set('confirm')}
                  error={pwd.errors.confirm}
                />
              </FormGrid>
              <p className={styles.help}>
                Al cambiarla se cerrará su sesión en todos los dispositivos.
              </p>
              <Actions>
                <Button type="submit" icon="lock" loading={pwd.saving}>
                  Cambiar contraseña
                </Button>
              </Actions>
            </Card>
          </form>
        </div>

        <Card title="Sesión">
          <p className={styles.help}>
            Cierre la sesión si usa un dispositivo compartido. Los datos guardados en este
            dispositivo se borran.
          </p>
          <Button
            variant="secondary"
            icon="logout"
            block
            loading={leaving}
            onClick={() => {
              setLeaving(true);
              void signOut();
            }}
          >
            Cerrar sesión en este dispositivo
          </Button>
        </Card>
      </div>
    </Page>
  );
}
