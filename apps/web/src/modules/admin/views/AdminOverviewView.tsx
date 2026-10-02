import { Button, Notice, Skeleton, Stat, StatGrid } from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { formatMoney } from '../../../core/js/format';
import { useAdminMetrics } from '../js/use-admin';
import { formatBytes, formatInt } from '../js/admin-labels';
import { AdminNav } from './AdminNav';
import styles from '../css/admin.module.css';

export default function AdminOverviewView() {
  const { data: m, isPending, error, refetch, isFetching } = useAdminMetrics();

  return (
    <Page
      title="Panel de plataforma"
      description="Salud general de AImargen: negocios, usuarios, uso de IA y seguridad."
      action={
        <Button
          variant="secondary"
          icon="refresh"
          onClick={() => void refetch()}
          loading={isFetching && !isPending}
        >
          Actualizar
        </Button>
      }
    >
      <AdminNav />
      {error && (
        <Notice tone="danger" title="No se pudieron cargar las métricas">
          {error.message}
        </Notice>
      )}
      {isPending ? (
        <StatGrid>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={96} radius={14} />
          ))}
        </StatGrid>
      ) : (
        m && (
          <div className={styles.stack}>
            <section className={styles.section} aria-labelledby="m-tenants">
              <h2 id="m-tenants" className={styles.sectionTitle}>
                Negocios y usuarios
              </h2>
              <StatGrid>
                <Stat label="Negocios activos" value={formatInt(m.tenantsActive)} />
                <Stat
                  label="Negocios suspendidos"
                  value={formatInt(m.tenantsSuspended)}
                  tone={m.tenantsSuspended > 0 ? 'warning' : undefined}
                />
                <Stat
                  label="Usuarios activos"
                  value={formatInt(m.usersActive)}
                  caption={`${formatInt(m.usersActive30d)} entraron en 30 días`}
                />
                <Stat
                  label="Registros nuevos"
                  value={formatInt(m.signups7d)}
                  caption={`Últimos 7 días · ${formatInt(m.signups30d)} en 30 días`}
                />
              </StatGrid>
            </section>
            <section className={styles.section} aria-labelledby="m-ai">
              <h2 id="m-ai" className={styles.sectionTitle}>
                IA y uso este mes
              </h2>
              <StatGrid>
                <Stat label="Consultas a la IA" value={formatInt(m.aiCallsMonth)} />
                <Stat
                  label="Costo estimado de IA"
                  value={formatMoney(m.aiCostMonth ?? '0', 'USD')}
                  caption="En dólares"
                />
                <Stat
                  label="Errores de herramientas IA"
                  value={formatInt(m.aiToolErrorsMonth)}
                  tone={m.aiToolErrorsMonth > 0 ? 'warning' : undefined}
                />
                <Stat label="Exportaciones" value={formatInt(m.exportsMonth)} />
                <Stat label="Almacenamiento total" value={formatBytes(m.storageBytes)} />
              </StatGrid>
            </section>
            <section className={styles.section} aria-labelledby="m-sec">
              <h2 id="m-sec" className={styles.sectionTitle}>
                Seguridad
              </h2>
              <StatGrid>
                <Stat
                  label="Ingresos fallidos (24 h)"
                  value={formatInt(m.failedLogins24h)}
                  tone={m.failedLogins24h > 20 ? 'danger' : undefined}
                />
                <Stat
                  label="Cuentas bloqueadas"
                  value={formatInt(m.usersLocked)}
                  caption="Por intentos fallidos"
                  tone={m.usersLocked > 0 ? 'warning' : undefined}
                />
              </StatGrid>
            </section>
          </div>
        )
      )}
    </Page>
  );
}
