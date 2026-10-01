import { useReadiness } from '../js/use-readiness';
import styles from '../css/system-status.module.css';

const LABELS: Record<string, string> = {
  api: 'API',
  database: 'Base de datos',
  migrations: 'Migraciones',
};

function Badge({ ok }: { ok: boolean }) {
  return (
    <span className={`${styles.badge} ${ok ? styles.ok : styles.fail}`}>
      <span aria-hidden="true">{ok ? '✓' : '✕'}</span>
      {ok ? 'Operativo' : 'Con fallas'}
    </span>
  );
}

/**
 * Vista de estado del sistema (Etapa 0). Verifica de punta a punta web → API → SP → MySQL.
 * Se mantiene como página interna de diagnóstico (/estado).
 */
export function SystemStatusView() {
  const { data, error, isPending, refetch, isFetching } = useReadiness();
  const checks = data?.checks ?? {};
  const apiOk = !!data;

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="status-title" aria-busy={isPending}>
        <h1 id="status-title" className={styles.brand}>
          AI<span className={styles.brandAccent}>margen</span>
        </h1>
        <p className={styles.claim}>Sepa cuánto cuesta. Sepa cuánto gana.</p>

        {isPending ? (
          <p role="status">Verificando el sistema…</p>
        ) : (
          <ul className={styles.list}>
            <li className={styles.row}>
              {LABELS.api}
              <Badge ok={apiOk} />
            </li>
            {Object.entries(checks).map(([k, v]) => (
              <li key={k} className={styles.row}>
                {LABELS[k] ?? k}
                <Badge ok={v === 'ok'} />
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className={styles.meta}>
            {error.message}
          </p>
        )}
        {data && (
          <p className={styles.meta}>
            Versión {data.version} · {new Date(data.time).toLocaleString('es-CR')}
          </p>
        )}

        <button
          type="button"
          className={styles.retry}
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'Verificando…' : 'Verificar de nuevo'}
        </button>
      </section>
    </main>
  );
}
