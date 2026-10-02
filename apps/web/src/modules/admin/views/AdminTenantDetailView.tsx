import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Actions,
  Button,
  Card,
  ConfirmSheet,
  DataTable,
  KeyValue,
  Notice,
  Segmented,
  Skeleton,
  StatusBadge,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { errorMessage } from '../../../core/js/api-client';
import { formatDate, formatDateTime, formatMoney } from '../../../core/js/format';
import { ROLE_LABELS } from '../../../core/session/js/session-types';
import {
  flagModeOf,
  useAdminTenant,
  useSetTenantStatus,
  useTenantFlags,
  type FlagMode,
} from '../js/use-admin';
import type { AdminTenantDetail } from '../js/admin.service';
import { formatBytes, formatInt, statusOf, TENANT_STATUS, USER_STATUS } from '../js/admin-labels';
import styles from '../css/admin.module.css';

export default function AdminTenantDetailView() {
  const { uuid } = useParams();
  const { data: t, isPending, error } = useAdminTenant(uuid);

  if (isPending) return <PageSkeleton />;
  if (error || !t) {
    return (
      <Page title="Negocio" back="/app/admin/tenants">
        <Notice tone="danger" title="No se encontró el negocio">
          {error?.message}
        </Notice>
      </Page>
    );
  }
  return <TenantDetail tenant={t} />;
}

function TenantDetail({ tenant: t }: { tenant: AdminTenantDetail }) {
  const toast = useToast();
  const setStatus = useSetTenantStatus(t.uuid);
  const [confirm, setConfirm] = useState(false);
  const suspended = t.status === 'suspended';
  const st = statusOf(TENANT_STATUS, t.status);

  const changeStatus = () =>
    setStatus.mutate(suspended ? 'active' : 'suspended', {
      onSuccess: () => {
        setConfirm(false);
        toast.show(suspended ? 'Negocio reactivado' : 'Negocio suspendido');
      },
      onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
    });

  return (
    <Page
      title={t.name}
      back="/app/admin/tenants"
      action={
        <Button
          variant={suspended ? 'primary' : 'secondary'}
          icon={suspended ? 'restore' : 'lock'}
          onClick={() => setConfirm(true)}
        >
          {suspended ? 'Reactivar' : 'Suspender'}
        </Button>
      }
    >
      <div className={styles.badges}>
        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
        {t.isDemo && <StatusBadge tone="info">Demo</StatusBadge>}
        <StatusBadge tone={t.onboardingCompleted ? 'positive' : 'warning'}>
          {t.onboardingCompleted ? 'Configuración completa' : 'Configuración pendiente'}
        </StatusBadge>
      </div>
      {suspended && (
        <Notice tone="warning" title="Negocio suspendido">
          Sus usuarios no pueden usar la aplicación hasta que se reactive. Los datos se conservan.
        </Notice>
      )}
      <div className={styles.detailGrid}>
        <Card title="Datos">
          <div>
            <KeyValue label="Razón social" value={t.legalName ?? '—'} />
            <KeyValue label="Correo" value={t.email ?? '—'} />
            <KeyValue label="Teléfono" value={t.phone ?? '—'} />
            <KeyValue label="País / moneda" value={`${t.country} · ${t.currency}`} />
            <KeyValue label="Plan" value={t.plan} />
            <KeyValue label="Alta" value={formatDate(t.createdAt)} />
            <KeyValue label="Última actividad" value={formatDateTime(t.lastActivityAt)} />
          </div>
        </Card>
        <Card title="Uso">
          <div>
            <KeyValue label="Ingredientes" value={formatInt(t.usage.ingredients)} />
            <KeyValue label="Productos" value={formatInt(t.usage.products)} />
            <KeyValue label="Compras" value={formatInt(t.usage.purchases)} />
            <KeyValue label="Exportaciones" value={formatInt(t.usage.exports)} />
            <KeyValue label="Almacenamiento" value={formatBytes(t.usage.storageBytes)} />
            <KeyValue label="Consultas IA (mes)" value={formatInt(t.usage.aiCallsMonth)} />
            <KeyValue
              label="Costo IA (mes)"
              value={formatMoney(t.usage.aiCostMonth ?? '0', 'USD')}
            />
          </div>
        </Card>
      </div>

      <Card title={`Usuarios (${t.users.length})`}>
        {t.users.length === 0 ? (
          <p className={styles.help}>Este negocio no tiene usuarios.</p>
        ) : (
          <DataTable
            caption="Usuarios del negocio"
            columns={[
              { key: 'name', label: 'Usuario' },
              { key: 'role', label: 'Rol' },
              { key: 'status', label: 'Estado' },
              { key: 'login', label: 'Último ingreso' },
            ]}
            rows={t.users.map((u) => {
              const us = statusOf(USER_STATUS, u.status);
              return {
                key: u.uuid,
                name: (
                  <span className={styles.cellMain}>
                    <span>{u.name}</span>
                    <span className={styles.cellSub}>{u.email}</span>
                  </span>
                ),
                role: ROLE_LABELS[u.role] ?? u.role,
                status: <StatusBadge tone={us.tone}>{us.label}</StatusBadge>,
                login: formatDate(u.lastLoginAt),
              };
            })}
          />
        )}
      </Card>

      <FlagsCard uuid={t.uuid} />

      <Actions>
        <Link className={styles.link} to={`/app/admin/audit?tenant=${t.uuid}`}>
          Ver auditoría de este negocio
        </Link>
      </Actions>

      <ConfirmSheet
        open={confirm}
        title={suspended ? '¿Reactivar este negocio?' : '¿Suspender este negocio?'}
        message={
          suspended ? (
            <p>Sus usuarios podrán volver a entrar y trabajar normalmente.</p>
          ) : (
            <p>
              Nadie de &quot;{t.name}&quot; podrá usar la aplicación hasta que lo reactive. No se
              borra ningún dato. La acción queda registrada en la auditoría.
            </p>
          )
        }
        confirmLabel={suspended ? 'Reactivar' : 'Suspender'}
        danger={!suspended}
        loading={setStatus.isPending}
        onConfirm={changeStatus}
        onClose={() => setConfirm(false)}
      />
    </Page>
  );
}

function FlagsCard({ uuid }: { uuid: string }) {
  const toast = useToast();
  const flags = useTenantFlags(uuid);
  const pendingCode = flags.mutation.isPending ? flags.mutation.variables?.code : undefined;

  const change = (code: string, mode: FlagMode) =>
    flags.mutation.mutate(
      { code, mode },
      {
        onSuccess: () => toast.show('Función actualizada'),
        onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
      },
    );

  return (
    <Card title="Funciones del negocio">
      <p className={styles.help}>
        &quot;Normal&quot; usa la configuración general de la plataforma. Active o desactive una
        función solo para este negocio cuando haga falta.
      </p>
      {flags.error && (
        <Notice tone="danger" title="No se pudieron cargar las funciones">
          {flags.error.message}
        </Notice>
      )}
      {flags.isPending ? (
        <Skeleton height={120} radius={10} />
      ) : (
        <ul className={styles.flagList}>
          {flags.items.map((f) => (
            <li key={f.code} className={styles.flag} aria-busy={pendingCode === f.code}>
              <div className={styles.flagHead}>
                <span className={styles.flagTitle}>
                  <strong>{f.description}</strong>
                  <span className={styles.flagCode}>{f.code}</span>
                </span>
                <StatusBadge tone={f.enabled ? 'positive' : 'neutral'}>
                  {f.enabled ? 'Habilitada' : 'Deshabilitada'}
                </StatusBadge>
              </div>
              <Segmented<FlagMode>
                label={`Estado de ${f.description}`}
                hideLabel
                value={flagModeOf(f.override)}
                onChange={(mode) => {
                  if (pendingCode) return;
                  change(f.code, mode);
                }}
                options={[
                  {
                    value: 'default',
                    label: f.defaultEnabled ? 'Normal (sí)' : 'Normal (no)',
                  },
                  { value: 'on', label: 'Activada' },
                  { value: 'off', label: 'Desactivada' },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
