import { useNavigate } from 'react-router';
import {
  Button,
  EmptyState,
  Icon,
  List,
  ListRow,
  Notice,
  Skeleton,
  StatusBadge,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useTenant } from '../../../core/session/js/session-context';
import { formatMoney } from '../../../core/js/format';
import { formatInputNumber } from '../../../core/js/form';
import { useFixedCosts, useScenarioList } from '../js/use-scenarios';
import type { ScenarioResult } from '../js/scenarios.service';
import styles from '../css/scenarios.module.css';

export default function ScenariosListView() {
  const navigate = useNavigate();
  const { can, currency } = useTenant();
  const list = useScenarioList();
  const fixed = useFixedCosts();
  const canWrite = can('scenarios.write');

  return (
    <Page
      title="Escenarios"
      description="Simule cuánto vendería y cuánto ganaría al mes. Un escenario nunca cambia sus recetas ni sus precios."
      back="/app/mas"
      action={
        canWrite && (
          <Button icon="plus" onClick={() => navigate('/app/scenarios/new')}>
            Nuevo
          </Button>
        )
      }
    >
      <button
        type="button"
        className={styles.fixedLink}
        onClick={() => navigate('/app/fixed-costs')}
      >
        <span className={styles.fixedIcon}>
          <Icon name="building" size={20} />
        </span>
        <span className={styles.fixedMain}>
          <span className={styles.fixedTitle}>Costos fijos del negocio</span>
          <span className={styles.fixedCaption}>
            {fixed.isPending
              ? 'Cargando…'
              : fixed.items.length === 0
                ? 'Aún no ha registrado alquiler, salarios ni servicios'
                : `${fixed.items.length} ${fixed.items.length === 1 ? 'costo' : 'costos'} · se usan en el punto de equilibrio`}
          </span>
        </span>
        {fixed.total !== null && (
          <span className={`num ${styles.fixedAmount}`}>
            {formatMoney(fixed.total, currency)}
            <span className={styles.fixedCaption}>al mes</span>
          </span>
        )}
        <Icon name="chevronRight" size={18} className={styles.chevron} />
      </button>

      {list.error && (
        <Notice tone="danger" title="No se pudieron cargar los escenarios">
          {list.error.message}
        </Notice>
      )}

      {list.isPending ? (
        <List label="Cargando">
          {[0, 1, 2].map((i) => (
            <li key={i} className={styles.skeletonRow}>
              <Skeleton width="45%" />
              <Skeleton width="30%" height={12} />
            </li>
          ))}
        </List>
      ) : list.items.length === 0 ? (
        <EmptyState
          icon="scenarios"
          title="Aún no tiene escenarios"
          description="Pruebe un precio y una cantidad de ventas por día para saber si cubre sus costos fijos y cuánto ganaría."
          action={
            canWrite && (
              <Button icon="plus" onClick={() => navigate('/app/scenarios/new')}>
                Simular un escenario
              </Button>
            )
          }
        />
      ) : (
        <List label="Escenarios">
          {list.items.map((s) => {
            const r = list.resultFor(s.uuid);
            const profit = r?.profit ?? null;
            return (
              <ListRow
                key={s.uuid}
                to={`/app/scenarios/${s.uuid}`}
                icon="scenarios"
                title={s.name}
                subtitle={[
                  s.productName ?? 'Sin producto',
                  `${formatMoney(s.price, currency)} c/u`,
                  `${formatInputNumber(s.unitsPerDay)} por día`,
                ].join(' · ')}
                badge={<ProfitBadge result={r} />}
                value={profit !== null ? formatMoney(profit, currency) : undefined}
                valueCaption={profit !== null ? 'utilidad al mes' : undefined}
              />
            );
          })}
        </List>
      )}
    </Page>
  );
}

function ProfitBadge({ result }: { result: ScenarioResult | null | undefined }) {
  if (!result?.profit) return null;
  const n = Number(result.profit);
  if (n < 0) return <StatusBadge tone="danger">Con pérdida</StatusBadge>;
  if (n === 0) return <StatusBadge tone="warning">En equilibrio</StatusBadge>;
  return <StatusBadge tone="positive">Con ganancia</StatusBadge>;
}
