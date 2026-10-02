import { useState } from 'react';
import { Link } from 'react-router';
import {
  Button,
  Card,
  Icon,
  List,
  ListRow,
  Notice,
  Skeleton,
  Stat,
  StatGrid,
  StatusBadge,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useTenant } from '../../../core/session/js/session-context';
import { formatMoney, formatPercent } from '../../../core/js/format';
import {
  PRODUCT_STATUS,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  alertIcon,
  firstName,
  greeting,
  insightFigures,
  sortAlerts,
  useDashboard,
  useGettingStarted,
  useMarginRanking,
  useQuickActions,
  type QuickAction,
} from '../js/use-home';
import type { Dashboard, HomeProduct } from '../js/home.service';
import styles from '../css/home.module.css';

const ALERTS_PREVIEW = 5;

export default function HomeView() {
  const { me, tenant, currency } = useTenant();
  const dashboard = useDashboard();
  const actions = useQuickActions();
  const { firstRun, steps } = useGettingStarted(dashboard.data);
  const name = firstName(me?.user.name);

  return (
    <Page title={`${greeting()}${name ? `, ${name}` : ''}`} description={tenant.name}>
      {dashboard.error && (
        <Notice
          tone="danger"
          title="No se pudo cargar el resumen"
          action={
            <Button variant="secondary" icon="refresh" onClick={() => void dashboard.refetch()}>
              Reintentar
            </Button>
          }
        >
          {dashboard.error.message}
        </Notice>
      )}

      {!dashboard.allowed ? (
        <QuickActions actions={actions} />
      ) : dashboard.isPending ? (
        <HomeSkeleton />
      ) : !dashboard.data ? null : firstRun ? (
        <>
          <GettingStarted steps={steps} />
          <QuickActions actions={actions} />
        </>
      ) : (
        <>
          <Kpis d={dashboard.data} currency={currency} />
          <div className={styles.columns}>
            <div className={styles.column}>
              <Alerts d={dashboard.data} />
              <MarginRanking currency={currency} />
            </div>
            <div className={styles.column}>
              <QuickActions actions={actions} />
              <Insights d={dashboard.data} currency={currency} />
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function HomeSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Cargando resumen">
      <StatGrid>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonStat}>
            <Skeleton width="60%" height={12} />
            <Skeleton width="45%" height={28} />
          </div>
        ))}
      </StatGrid>
      <Skeleton height={180} radius={14} />
      <Skeleton height={140} radius={14} />
    </div>
  );
}

function Kpis({ d, currency }: { d: Dashboard; currency: string }) {
  const k = d.kpis;
  const sc = k.activeScenario;
  const scProfit = sc?.profit ?? null;
  const scUnits = sc?.breakEvenUnits ?? null;
  const marginTone =
    k.averageMargin === null ? undefined : Number(k.averageMargin) < 0 ? 'danger' : undefined;
  const profitTone = scProfit === null ? undefined : Number(scProfit) < 0 ? 'danger' : 'positive';
  return (
    <section aria-labelledby="kpi-title" className={`${styles.section} ${styles.kpis}`}>
      <h2 id="kpi-title" className="srOnly">
        Indicadores
      </h2>
      <StatGrid>
        <Stat
          label="Productos"
          value={k.productsCount}
          caption={
            k.productsNoPrice > 0
              ? `${k.productsNoPrice} sin precio`
              : k.productsCount > 0
                ? 'Todos con precio'
                : 'Aún no hay recetas'
          }
        />
        <Stat
          label="Margen promedio"
          value={k.averageMargin === null ? '—' : formatPercent(k.averageMargin)}
          caption={
            k.averageMargin === null ? 'Defina precios para verlo' : 'De productos con precio'
          }
          tone={marginTone}
        />
        <Stat
          label="Bajo margen objetivo"
          value={k.productsBelowTarget}
          tone={k.productsBelowTarget > 0 ? 'warning' : undefined}
          caption={
            k.productsBelowCost > 0
              ? `${k.productsBelowCost} ${k.productsBelowCost === 1 ? 'vende' : 'venden'} bajo el costo`
              : 'Ninguno bajo el costo'
          }
        />
        <Stat
          label="Costo promedio por porción"
          value={
            k.averageCostPerPortion === null ? '—' : formatMoney(k.averageCostPerPortion, currency)
          }
          caption="Recetas con costo completo"
        />
        <Stat
          label="Ingredientes sin costo"
          value={k.ingredientsMissingCost}
          tone={k.ingredientsMissingCost > 0 ? 'warning' : undefined}
          caption={`De ${k.ingredientsCount} ${k.ingredientsCount === 1 ? 'ingrediente' : 'ingredientes'}`}
        />
        <Stat
          label="Costos fijos al mes"
          value={k.fixedCostsMonthly === null ? '—' : formatMoney(k.fixedCostsMonthly, currency)}
          caption={<Link to="/app/fixed-costs">Ver costos fijos</Link>}
        />
        <Stat
          label="Utilidad estimada"
          value={scProfit === null ? '—' : formatMoney(scProfit, currency)}
          tone={profitTone}
          caption={
            sc ? (
              <Link to={`/app/scenarios/${sc.uuid}`}>{sc.name}</Link>
            ) : (
              <Link to="/app/scenarios/new">Simule un escenario</Link>
            )
          }
        />
        <Stat
          label="Punto de equilibrio"
          value={scUnits === null ? '—' : `${scUnits} unid.`}
          caption={
            sc?.breakEvenRevenue
              ? `Al mes · ${formatMoney(sc.breakEvenRevenue, currency)} en ventas`
              : 'Según su escenario'
          }
        />
      </StatGrid>
    </section>
  );
}

function Alerts({ d }: { d: Dashboard }) {
  const [all, setAll] = useState(false);
  const sorted = sortAlerts(d.alerts);
  const shown = all ? sorted : sorted.slice(0, ALERTS_PREVIEW);
  return (
    <Card
      title="Alertas"
      action={
        sorted.length > 0 && (
          <span className={styles.count}>
            {sorted.length} {sorted.length === 1 ? 'pendiente' : 'pendientes'}
          </span>
        )
      }
    >
      {sorted.length === 0 ? (
        <p className={styles.allGood}>
          <Icon name="check" size={20} />
          Todo en orden: no hay precios bajo el costo ni datos pendientes.
        </p>
      ) : (
        <>
          <List label="Alertas">
            {shown.map((a, i) => (
              <ListRow
                key={`${a.code}-${i}`}
                to={a.link ?? undefined}
                icon={alertIcon(a)}
                title={a.title}
                subtitle={a.detail}
                badge={
                  <StatusBadge tone={SEVERITY_TONE[a.severity]}>
                    {SEVERITY_LABEL[a.severity]}
                  </StatusBadge>
                }
              />
            ))}
          </List>
          {sorted.length > ALERTS_PREVIEW && (
            <Button variant="ghost" onClick={() => setAll((v) => !v)}>
              {all ? 'Ver menos' : `Ver todas (${sorted.length})`}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function Insights({ d, currency }: { d: Dashboard; currency: string }) {
  return (
    <Card title="Análisis automático">
      {d.insights.length === 0 ? (
        <p className={styles.muted}>
          Sin novedades. Aquí verá cambios de costo y productos que conviene revisar.
        </p>
      ) : (
        <ul className={styles.insights}>
          {d.insights.map((ins, i) => {
            const figs = insightFigures(ins.figures, currency);
            const body = (
              <>
                <span className={styles.insightIcon}>
                  <Icon name="pulse" size={18} />
                </span>
                <span className={styles.insightBody}>
                  <span className={styles.insightText}>{ins.text}</span>
                  {figs.length > 0 && (
                    <span className={styles.figures}>
                      {figs.map((f) => (
                        <span key={f.key} className={styles.figure}>
                          {f.label} <span className="num">{f.value}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                {ins.link && <Icon name="chevronRight" size={18} className={styles.chevron} />}
              </>
            );
            return (
              <li key={`${ins.code}-${i}`}>
                {ins.link ? (
                  <Link to={ins.link} className={styles.insight}>
                    {body}
                  </Link>
                ) : (
                  <div className={styles.insight}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className={styles.footnote}>
        Calculado con sus datos actuales. Cada cifra sale de sus recetas y compras.
      </p>
    </Card>
  );
}

function MarginRanking({ currency }: { currency: string }) {
  const r = useMarginRanking();
  if (r.isPending || r.count === 0) return null;
  const row = (p: HomeProduct) => (
    <ListRow
      key={p.uuid}
      to={`/app/products/${p.uuid}`}
      title={p.name}
      subtitle={p.currentPrice ? `Precio ${formatMoney(p.currentPrice, currency)}` : undefined}
      badge={
        <StatusBadge tone={PRODUCT_STATUS[p.pricing.status].tone}>
          {PRODUCT_STATUS[p.pricing.status].label}
        </StatusBadge>
      }
      value={formatPercent(p.pricing.margin ?? '0')}
      valueCaption="margen"
    />
  );
  return (
    <Card
      title={r.worst.length ? 'Mejor margen' : 'Margen por producto'}
      action={
        <Link to="/app/products" className={styles.cardLink}>
          Ver productos
        </Link>
      }
    >
      <List label="Productos con mejor margen">{r.best.map(row)}</List>
      {r.worst.length > 0 && (
        <>
          <h3 className={styles.subTitle}>Menor margen</h3>
          <List label="Productos con menor margen">{r.worst.map(row)}</List>
        </>
      )}
    </Card>
  );
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section aria-labelledby="quick-title" className={styles.section}>
      <h2 id="quick-title" className={styles.sectionTitle}>
        Accesos rápidos
      </h2>
      <ul className={styles.quick}>
        {actions.map((a) => (
          <li key={a.id}>
            <Link to={a.to} className={styles.quickItem}>
              <span className={styles.quickIcon}>
                <Icon name={a.icon} size={22} />
              </span>
              <span className={styles.quickLabel}>{a.label}</span>
              <span className={styles.quickDesc}>{a.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GettingStarted({ steps }: { steps: ReturnType<typeof useGettingStarted>['steps'] }) {
  const next = steps.find((s) => !s.done && s.allowed);
  return (
    <Card title="Empecemos en 3 pasos">
      <p className={styles.muted}>
        En pocos minutos sabrá cuánto le cuesta cada plato y cuánto gana al venderlo.
      </p>
      <ol className={styles.steps}>
        {steps.map((s, i) => {
          const isNext = s === next;
          return (
            <li key={s.id} className={`${styles.step} ${isNext ? styles.stepNext : ''}`}>
              <span
                className={`${styles.stepMark} ${s.done ? styles.stepDone : ''}`}
                aria-hidden="true"
              >
                {s.done ? <Icon name="check" size={18} /> : i + 1}
              </span>
              <span className={styles.stepBody}>
                <span className={styles.stepTitle}>
                  {s.title}
                  {s.done && <span className="srOnly"> (listo)</span>}
                </span>
                <span className={styles.stepDesc}>{s.description}</span>
              </span>
              {s.allowed && !s.done && (
                <Link
                  to={s.to}
                  className={`${styles.stepAction} ${isNext ? styles.stepActionPrimary : ''}`}
                >
                  {isNext ? 'Empezar' : 'Ir'}
                  <Icon name="arrowRight" size={18} />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
