import { Link } from 'react-router';
import {
  DataTable,
  EmptyState,
  Notice,
  Skeleton,
  Stat,
  StatGrid,
  TextField,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { formatMoney } from '../../../core/js/format';
import { currentMonth, useAiUsage } from '../js/use-admin';
import { formatInt } from '../js/admin-labels';
import { AdminNav } from './AdminNav';
import styles from '../css/admin.module.css';

export default function AdminAiView() {
  const ai = useAiUsage();

  return (
    <Page
      title="Uso de IA"
      description="Consumo del asistente por negocio: consultas, tokens y costo estimado."
    >
      <AdminNav />
      <TextField
        className={styles.monthField}
        label="Mes"
        type="month"
        value={ai.month}
        max={currentMonth()}
        onChange={(e) => ai.setMonth(e.target.value)}
      />
      {ai.error && (
        <Notice tone="danger" title="No se pudo cargar el uso de IA">
          {ai.error.message}
        </Notice>
      )}
      {ai.isPending ? (
        <Skeleton height={240} radius={14} />
      ) : ai.items.length === 0 ? (
        <EmptyState
          icon="ai"
          title="Sin uso de IA en este mes"
          description="Ningún negocio usó el asistente en el periodo elegido. Pruebe con otro mes."
        />
      ) : (
        <>
          <StatGrid>
            <Stat label="Consultas" value={formatInt(ai.totals.calls)} />
            <Stat label="Tokens" value={formatInt(ai.totals.tokens)} />
            <Stat
              label="Errores de herramientas"
              value={formatInt(ai.totals.toolErrors)}
              tone={ai.totals.toolErrors > 0 ? 'warning' : undefined}
            />
          </StatGrid>
          <DataTable
            caption="Uso de IA por negocio"
            columns={[
              { key: 'tenant', label: 'Negocio' },
              { key: 'calls', label: 'Consultas', align: 'right' },
              { key: 'input', label: 'Tokens entrada', align: 'right' },
              { key: 'output', label: 'Tokens salida', align: 'right' },
              { key: 'tools', label: 'Herramientas', align: 'right' },
              { key: 'errors', label: 'Errores', align: 'right' },
              { key: 'cost', label: 'Costo (USD)', align: 'right' },
            ]}
            rows={ai.items.map((r) => ({
              key: r.tenantUuid,
              tenant: (
                <Link className={styles.link} to={`/app/admin/tenants/${r.tenantUuid}`}>
                  {r.tenantName}
                </Link>
              ),
              calls: formatInt(r.calls),
              input: formatInt(r.inputTokens),
              output: formatInt(r.outputTokens),
              tools: formatInt(r.toolCalls),
              errors: formatInt(r.toolErrors),
              cost: formatMoney(r.costUsd ?? '0', 'USD'),
            }))}
          />
        </>
      )}
    </Page>
  );
}
