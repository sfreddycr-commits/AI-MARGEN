import { useState } from 'react';
import {
  Actions,
  Button,
  ConfirmSheet,
  EmptyState,
  FormGrid,
  List,
  ListRow,
  Notice,
  Sheet,
  Skeleton,
  StatusBadge,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { ROLE_LABELS } from '../../../core/session/js/session-types';
import { formatDate } from '../../../core/js/format';
import { useInviteUser, useTeam, useUpdateUser, type InviteFormValues } from '../js/use-settings';
import type { TenantUser } from '../js/settings.service';
import { ROLE_DESCRIPTIONS, USER_STATUS, type InvitableRole } from '../js/settings-labels';
import styles from '../css/settings.module.css';

export default function UsersView() {
  const team = useTeam();
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<TenantUser | null>(null);
  const canInvite = team.canManage && team.assignableRoles.length > 0;

  return (
    <Page
      title="Usuarios"
      description="Las personas de su equipo que usan AImargen y lo que cada una puede hacer."
      back="/app/settings"
      action={
        canInvite && (
          <Button icon="plus" onClick={() => setInviting(true)}>
            Invitar
          </Button>
        )
      }
    >
      {team.error && (
        <Notice tone="danger" title="No se pudo cargar el equipo">
          {team.error.message}
        </Notice>
      )}
      {team.isPending ? (
        <List label="Cargando">
          {[0, 1, 2].map((i) => (
            <li key={i} className={styles.skeletonRow}>
              <Skeleton width="45%" />
              <Skeleton width="30%" height={12} />
            </li>
          ))}
        </List>
      ) : team.users.length <= 1 ? (
        <>
          <List label="Usuarios">
            {team.users.map((u) => (
              <UserRow key={u.uuid} user={u} isMe={u.uuid === team.myUuid} />
            ))}
          </List>
          <EmptyState
            icon="users"
            title="Aún trabaja solo"
            description="Invite a su encargado o a quien registra las compras. Cada persona entra con su propio correo y contraseña."
            action={
              canInvite && (
                <Button icon="plus" onClick={() => setInviting(true)}>
                  Invitar a alguien
                </Button>
              )
            }
          />
        </>
      ) : (
        <List label="Usuarios">
          {team.users.map((u) => (
            <UserRow
              key={u.uuid}
              user={u}
              isMe={u.uuid === team.myUuid}
              onClick={team.isEditable(u) ? () => setEditing(u) : undefined}
            />
          ))}
        </List>
      )}

      {canInvite && inviting && (
        <InviteSheet open roles={team.assignableRoles} onClose={() => setInviting(false)} />
      )}
      {editing && (
        <EditUserSheet
          key={editing.uuid}
          user={editing}
          roles={team.assignableRoles}
          onClose={() => setEditing(null)}
        />
      )}
    </Page>
  );
}

function UserRow({
  user,
  isMe,
  onClick,
}: {
  user: TenantUser;
  isMe: boolean;
  onClick?: () => void;
}) {
  const st = USER_STATUS[user.status] ?? { label: user.status, tone: 'neutral' as const };
  return (
    <ListRow
      icon="user"
      title={isMe ? `${user.name} (usted)` : user.name}
      subtitle={user.email}
      badge={<StatusBadge tone={st.tone}>{st.label}</StatusBadge>}
      value={ROLE_LABELS[user.role] ?? user.role}
      valueCaption={
        user.status === 'invited'
          ? `Invitado ${formatDate(user.createdAt)}`
          : user.lastLoginAt
            ? `Último ingreso ${formatDate(user.lastLoginAt)}`
            : 'Sin ingresos'
      }
      onClick={onClick}
      muted={user.status === 'blocked'}
    />
  );
}

function RoleOptions({
  roles,
  value,
  onChange,
  error,
}: {
  roles: readonly InvitableRole[];
  value: string;
  onChange: (r: InvitableRole) => void;
  error?: string;
}) {
  return (
    <fieldset className={styles.options}>
      <legend className={styles.optionsLegend}>Rol</legend>
      {roles.map((r) => (
        <label key={r} className={styles.option}>
          <input
            type="radio"
            name="role"
            className={styles.radio}
            value={r}
            checked={value === r}
            onChange={() => onChange(r)}
          />
          <span className={styles.optionText}>
            <span className={styles.optionTitle}>{ROLE_LABELS[r] ?? r}</span>
            <span className={styles.optionDescription}>{ROLE_DESCRIPTIONS[r]}</span>
          </span>
        </label>
      ))}
      {error && <Notice tone="danger" title={error} />}
    </fieldset>
  );
}

function InviteSheet({
  open,
  roles,
  onClose,
}: {
  open: boolean;
  roles: readonly InvitableRole[];
  onClose: () => void;
}) {
  const toast = useToast();
  const empty: InviteFormValues = {
    name: '',
    email: '',
    role: roles.includes('operator') ? 'operator' : (roles[0] ?? ''),
  };
  const [values, setValues] = useState<InviteFormValues>(empty);
  const close = onClose;
  const invite = useInviteUser((u) => {
    toast.show(`Invitación enviada a ${u.email}`);
    onClose();
  });

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Invitar a su equipo"
      footer={
        <Actions>
          <Button variant="secondary" onClick={close} disabled={invite.saving}>
            Cancelar
          </Button>
          <Button type="submit" form="invite-form" icon="send" loading={invite.saving}>
            Enviar invitación
          </Button>
        </Actions>
      }
    >
      <form
        id="invite-form"
        noValidate
        className={styles.sheetForm}
        onSubmit={(e) => {
          e.preventDefault();
          invite.submit(values);
        }}
      >
        {invite.formError && <Notice tone="danger" title={invite.formError} />}
        <p className={styles.help}>
          Le enviaremos un correo con un enlace para crear su contraseña. El enlace vence en 7 días.
        </p>
        <FormGrid columns={1}>
          <TextField
            label="Nombre"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            error={invite.errors.name}
            autoComplete="off"
          />
          <TextField
            label="Correo"
            type="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            error={invite.errors.email}
            autoComplete="off"
          />
        </FormGrid>
        <RoleOptions
          roles={roles}
          value={values.role}
          onChange={(role) => setValues((v) => ({ ...v, role }))}
          error={invite.errors.role}
        />
      </form>
    </Sheet>
  );
}

function EditUserSheet({
  user,
  roles,
  onClose,
}: {
  user: TenantUser;
  roles: readonly InvitableRole[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [role, setRole] = useState(user.role);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const update = useUpdateUser((u) => {
    toast.show(
      u.status === 'blocked'
        ? `${u.name} fue bloqueado`
        : user.status === 'blocked'
          ? `${u.name} fue reactivado`
          : 'Rol actualizado',
    );
    setConfirmBlock(false);
    onClose();
  });
  const blocked = user.status === 'blocked';
  const currentStatus = blocked ? 'blocked' : 'active';
  const st = USER_STATUS[user.status] ?? { label: user.status, tone: 'neutral' as const };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title="Editar usuario"
        footer={
          <Actions>
            <Button variant="secondary" onClick={onClose} disabled={update.saving}>
              Cancelar
            </Button>
            <Button
              onClick={() => update.save(user.uuid, role, currentStatus)}
              loading={update.pendingStatus === currentStatus}
              disabled={role === user.role || update.saving}
            >
              Guardar rol
            </Button>
          </Actions>
        }
      >
        <div className={styles.sheetForm}>
          {update.formError && <Notice tone="danger" title={update.formError} />}
          <div className={styles.userSummary}>
            <strong>{user.name}</strong>
            <span className={styles.muted}>{user.email}</span>
            <span className={styles.userBadges}>
              <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
            </span>
          </div>
          <RoleOptions roles={roles} value={role} onChange={setRole} />
          {blocked ? (
            <Button
              variant="secondary"
              icon="restore"
              onClick={() => update.save(user.uuid, role, 'active')}
              loading={update.pendingStatus === 'active'}
              disabled={update.saving}
            >
              Reactivar acceso
            </Button>
          ) : (
            <Button
              variant="ghost"
              icon="lock"
              onClick={() => setConfirmBlock(true)}
              disabled={update.saving}
            >
              Bloquear acceso
            </Button>
          )}
        </div>
      </Sheet>
      <ConfirmSheet
        open={confirmBlock}
        title={`¿Bloquear a ${user.name}?`}
        message={
          <p>
            No podrá entrar a AImargen hasta que usted lo reactive. Lo que registró se conserva.
          </p>
        }
        confirmLabel="Bloquear"
        danger
        loading={update.saving}
        onConfirm={() => update.save(user.uuid, role, 'blocked')}
        onClose={() => setConfirmBlock(false)}
      />
    </>
  );
}
