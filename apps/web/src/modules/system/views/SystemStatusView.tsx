import { Button, Notice, Skeleton, StatusBadge } from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useReadiness } from '../js/use-readiness';
import styles from '../css/system-status.module.css';

const LABELS: Record<string, string> = {
  api: 'Servidor de la aplicación',
  database: 'Base de datos',
  migrations: 'Estructura de datos al día',
};

/**
 * Estado del sistema: verifica de punta a punta web → API → SP → MySQL.
 * Útil para soporte y para diagnosticar problemas de conexión.
 */
export function SystemStatusView() {
  const { data, error, isPending, refetch, isFetching } = useReadiness();
  const rows: Array<[string, boolean]> = data
    ? [
        ['api', true],
        ...Object.entries(data.checks ?? {}).map(([k, v]) => [k, v === 'ok'] as [string, boolean]),
      ]
    : [];

  return (
    <Page
      title="Estado del sistema"
      description="Comprueba que la aplicación, la base de datos y su estructura respondan correctamente."
      back="/app/mas"
      action={
        <Button
          variant="secondary"
          icon="refresh"
          onClick={() => void refetch()}
          loading={isFetching}
        >
          Verificar
        </Button>
      }
    >
      {error && (
        <Notice tone="danger" title="No se pudo verificar el sistema">
          {error.message}
        </Notice>
      )}

      <ul className={styles.list} aria-busy={isPending}>
        {isPending
          ? [0, 1, 2].map((i) => (
              <li key={i} className={styles.row}>
                <Skeleton width="50%" />
                <Skeleton width={90} height={22} radius={999} />
              </li>
            ))
          : rows.map(([k, ok]) => (
              <li key={k} className={styles.row}>
                <span>{LABELS[k] ?? k}</span>
                <StatusBadge tone={ok ? 'positive' : 'danger'}>
                  {ok ? 'Operativo' : 'Con fallas'}
                </StatusBadge>
              </li>
            ))}
      </ul>

      {data && (
        <p className={styles.meta}>
          Versión {data.version}. Última verificación el{' '}
          {new Date(data.time).toLocaleString('es-CR', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
      )}
    </Page>
  );
}
