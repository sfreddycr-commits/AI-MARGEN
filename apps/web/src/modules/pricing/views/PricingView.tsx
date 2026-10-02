import { Link, useNavigate } from 'react-router';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  KeyValue,
  MarginBar,
  Notice,
  NumberField,
  Segmented,
  Skeleton,
  Stat,
  StatGrid,
  StatusBadge,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useSession, useTenant } from '../../../core/session/js/session-context';
import { errorMessage } from '../../../core/js/api-client';
import { fractionToPercentInput } from '../../../core/js/form';
import { currencySymbol, formatDecimal, formatMoney, formatPercent } from '../../../core/js/format';
import {
  STATUS_META,
  useApplyPrice,
  usePriceCalculator,
  usePricingOverview,
  type CalcMode,
} from '../js/use-pricing';
import type { PricingRow } from '../js/pricing.service';
import styles from '../css/pricing.module.css';

const money = (v: string | null | undefined, currency: string) =>
  v === null || v === undefined ? '—' : formatMoney(v, currency);

export default function PricingView() {
  const navigate = useNavigate();
  const { can } = useSession();
  const overview = usePricingOverview();
  const { counts } = overview;

  return (
    <Page
      title="Precio y margen"
      description="Qué productos ganan lo que usted espera, cuáles no y a qué precio deberían venderse."
    >
      {overview.error && (
        <Notice tone="danger" title="No se pudo cargar el resumen de precios">
          {overview.error.message}
        </Notice>
      )}

      {overview.isPending ? (
        <div className={styles.statSkeleton}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={92} radius={14} />
          ))}
        </div>
      ) : (
        overview.rows.length > 0 && (
          <StatGrid>
            <Stat
              label="Saludables"
              value={counts.healthy}
              caption="Alcanzan su margen objetivo"
              tone={counts.healthy > 0 ? 'positive' : undefined}
            />
            <Stat
              label="Bajo objetivo"
              value={counts.below_target}
              caption="Ganan menos de lo esperado"
              tone={counts.below_target > 0 ? 'warning' : undefined}
            />
            <Stat
              label="Bajo costo"
              value={counts.below_cost}
              caption="Pierden dinero en cada venta"
              tone={counts.below_cost > 0 ? 'danger' : undefined}
            />
            <Stat
              label="Sin precio"
              value={counts.no_price}
              caption={
                counts.incomplete > 0
                  ? `${counts.incomplete} con costo incompleto`
                  : 'Aún sin precio de venta'
              }
            />
          </StatGrid>
        )
      )}

      <div className={styles.layout}>
        <section className={styles.attention} aria-labelledby="attention-title">
          <h2 id="attention-title" className={styles.sectionTitle}>
            Productos que necesitan atención
          </h2>
          {overview.isPending ? (
            <div className={styles.list}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.skeletonRow}>
                  <Skeleton width="50%" />
                  <Skeleton width="70%" height={12} />
                </div>
              ))}
            </div>
          ) : overview.rows.length === 0 ? (
            <EmptyState
              icon="products"
              title="Aún no tiene productos"
              description="Cree una receta y aquí verá si su precio deja la ganancia que usted espera."
              action={
                can('products.write') && (
                  <Button icon="plus" onClick={() => navigate('/app/products/new')}>
                    Crear producto
                  </Button>
                )
              }
            />
          ) : overview.attention.length === 0 ? (
            <Notice tone="positive" title="Todo en orden">
              Todos sus productos alcanzan su margen objetivo.
            </Notice>
          ) : (
            <ul className={styles.list}>
              {overview.attention.map((r) => (
                <AttentionRow key={r.uuid} row={r} canApply={can('pricing.write')} />
              ))}
            </ul>
          )}
        </section>

        <Calculator />
      </div>
    </Page>
  );
}

function AttentionRow({ row, canApply }: { row: PricingRow; canApply: boolean }) {
  const { currency } = useTenant();
  const toast = useToast();
  const apply = useApplyPrice();
  const a = row.analysis;
  const meta = STATUS_META[row.status];
  const recommended = a?.byMargin?.price ?? null;
  const hasPrice = row.currentPrice !== null && Number(row.currentPrice) > 0;
  const diff = a?.differenceToRecommended ?? null;
  const showApply = canApply && recommended !== null && recommended !== row.currentPrice;

  const onApply = () =>
    apply.mutate(
      { row, price: recommended },
      {
        onSuccess: (updated) =>
          toast.show(`${row.name}: precio actualizado a ${formatMoney(recommended!, currency)}`, {
            action: {
              label: 'Deshacer',
              onClick: () => {
                apply
                  .undo(row, updated)
                  .then(() => toast.show('Precio anterior restaurado', { tone: 'info' }))
                  .catch((e: unknown) => toast.show(errorMessage(e), { tone: 'error' }));
              },
            },
          }),
        onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
      },
    );

  return (
    <li className={styles.row}>
      <div className={styles.rowHead}>
        <Link to={`/app/products/${row.uuid}`} className={styles.rowName}>
          {row.name}
        </Link>
        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      </div>
      <div className={styles.compare}>
        <div className={styles.compareCell}>
          <span className={styles.label}>Precio actual</span>
          <span className={`num ${styles.value}`}>
            {hasPrice ? money(row.currentPrice, currency) : 'Sin precio'}
          </span>
          <span className={styles.caption}>
            {hasPrice && a?.current?.margin
              ? `Margen ${formatPercent(a.current.margin)}`
              : `Costo ${money(row.costPerPortion, currency)}`}
          </span>
        </div>
        <Icon name="arrowRight" size={18} className={styles.compareArrow} />
        <div className={styles.compareCell}>
          <span className={styles.label}>Sugerido</span>
          <span className={`num ${styles.value} ${styles.recommended}`}>
            {money(recommended, currency)}
          </span>
          <span className={styles.caption}>
            {row.effectiveTargetMargin
              ? `Margen ${formatPercent(row.effectiveTargetMargin)}`
              : 'Sin margen objetivo'}
          </span>
        </div>
      </div>
      {hasPrice && a?.current?.margin && row.costPerPortion && (
        <MarginBar
          compact
          cost={row.costPerPortion}
          price={row.currentPrice!}
          margin={a.current.margin}
          target={row.effectiveTargetMargin}
          currency={currency}
        />
      )}
      <div className={styles.rowFoot}>
        <span className={styles.caption}>
          {row.status === 'incomplete'
            ? 'Falta el costo de algún ingrediente: el costo real puede ser mayor.'
            : diff && Number(diff) > 0 && hasPrice
              ? `Subir ${formatMoney(diff, currency)} por porción`
              : `Costo por porción ${money(row.costPerPortion, currency)}`}
        </span>
        {showApply && (
          <Button
            variant={row.status === 'below_cost' ? 'primary' : 'secondary'}
            loading={apply.isPending}
            onClick={onApply}
          >
            Aplicar
          </Button>
        )}
      </div>
    </li>
  );
}

function Calculator() {
  const { tenant, currency } = useTenant();
  const calc = usePriceCalculator(fractionToPercentInput(tenant.settings.targetMargin) || '35');
  const { values, errors, result: r } = calc;
  const symbol = currencySymbol(currency).trim();
  const byMargin = r?.byMargin;
  const byMult = r?.byMultiplier;
  const main = values.mode === 'margin' ? byMargin : byMult;
  const current = r?.current;
  const hasCurrent = current?.price && Number(current.price) > 0 && current.margin;

  return (
    <Card title="Calculadora de precio" className={styles.calculator}>
      <p className={styles.caption}>
        Escriba un costo por porción y vea a qué precio vender. No guarda nada.
      </p>
      <NumberField
        kind="money"
        currencySymbol={symbol}
        label="Costo por porción"
        value={values.cost}
        onChange={(e) => calc.set('cost', e.target.value)}
        error={errors.cost}
        placeholder="0"
      />
      <Segmented<CalcMode>
        label="Calcular el precio con"
        value={values.mode}
        onChange={(m) => calc.set('mode', m)}
        options={[
          { value: 'margin', label: 'Margen objetivo' },
          { value: 'multiplier', label: 'Multiplicador' },
        ]}
      />
      {values.mode === 'margin' ? (
        <NumberField
          kind="percent"
          label="Margen objetivo"
          hint="Qué parte del precio quiere que sea ganancia."
          value={values.margin}
          onChange={(e) => calc.set('margin', e.target.value)}
          error={errors.targetMargin}
        />
      ) : (
        <NumberField
          label="Multiplicador"
          hint="Cuántas veces quiere cobrar el costo."
          prefix="×"
          value={values.multiplier}
          onChange={(e) => calc.set('multiplier', e.target.value)}
          error={errors.multiplier}
        />
      )}
      <NumberField
        kind="money"
        currencySymbol={symbol}
        label="Precio actual (opcional)"
        hint="Para comparar con lo que cobra hoy."
        value={values.currentPrice}
        onChange={(e) => calc.set('currentPrice', e.target.value)}
        error={errors.currentPrice}
      />

      {calc.error && <Notice tone="danger" title={calc.error} />}

      {!calc.ready ? (
        <p className={styles.hintBox}>Ingrese el costo para ver el precio sugerido.</p>
      ) : !r ? (
        <Skeleton height={120} radius={10} />
      ) : (
        <div
          className={`${styles.result} ${calc.pending ? styles.pending : ''}`}
          aria-live="polite"
        >
          <div className={styles.resultMain}>
            <span className={styles.label}>
              {values.mode === 'margin' ? 'Precio por margen' : 'Precio por multiplicador'}
            </span>
            <span className={`num ${styles.big}`}>{money(main?.price, currency)}</span>
            <span className={styles.caption}>
              Ganancia {money(main?.profit, currency)} por porción
            </span>
          </div>
          <div>
            {values.mode === 'margin' && r.equivalentMultiplier && (
              <KeyValue
                label="Multiplicador equivalente"
                value={`× ${formatDecimal(r.equivalentMultiplier, 2)}`}
              />
            )}
            {values.mode === 'multiplier' && r.multiplierMargin && (
              <KeyValue label="Margen que deja" value={formatPercent(r.multiplierMargin)} />
            )}
            {hasCurrent && (
              <>
                <KeyValue label="Ganancia con su precio" value={money(current.profit, currency)} />
                <KeyValue
                  label="Margen real con su precio"
                  value={formatPercent(current.margin!)}
                />
                {values.mode === 'margin' && r.differenceToRecommended && (
                  <KeyValue
                    label="Diferencia con el sugerido"
                    value={formatMoney(r.differenceToRecommended, currency)}
                    hint={
                      Number(r.differenceToRecommended) > 0
                        ? 'Le conviene subir el precio'
                        : 'Su precio ya cubre el margen'
                    }
                  />
                )}
              </>
            )}
          </div>
          {hasCurrent && calc.cost && (
            <MarginBar
              cost={calc.cost}
              price={current.price!}
              margin={current.margin!}
              target={calc.target}
              currency={currency}
            />
          )}
          {r.warnings
            .filter((w) => w.code !== 'NO_PRICE')
            .map((w) => (
              <Notice
                key={w.code}
                tone={w.code === 'PRICE_BELOW_COST' ? 'danger' : 'warning'}
                title={w.message}
              />
            ))}
        </div>
      )}

      <div className={styles.explain}>
        <Icon name="info" size={18} />
        <div>
          <p className={styles.explainTitle}>Margen no es lo mismo que multiplicador</p>
          <p>
            El <strong>margen</strong> es la parte del precio que le queda de ganancia. El{' '}
            <strong>multiplicador</strong> es cuántas veces cobra el costo. Si algo cuesta ₡1.000 y
            lo vende en ₡3.000 (× 3), su margen es 66,7%, no 300%. Un margen de 50% equivale a × 2 y
            uno de 35% a × 1,54.
          </p>
        </div>
      </div>
    </Card>
  );
}
