import {
  Button,
  Icon,
  MarginBar,
  Notice,
  Skeleton,
  Stat,
  StatGrid,
  StatusBadge,
} from '../../../core/ui';
import { formatMoney, formatPercent } from '../../../core/js/format';
import type { Product, ProductDetail, ProductStatus } from '../js/onboarding.service';
import { useResultStep } from '../js/use-onboarding';
import styles from '../css/onboarding.module.css';

const STATUS: Record<
  ProductStatus,
  { tone: 'positive' | 'warning' | 'danger' | 'info'; text: string }
> = {
  healthy: { tone: 'positive', text: 'Margen saludable' },
  below_target: { tone: 'warning', text: 'Margen debajo de su meta' },
  below_cost: { tone: 'danger', text: 'Precio por debajo del costo' },
  no_price: { tone: 'info', text: 'Aún sin precio de venta' },
  incomplete: { tone: 'warning', text: 'Costo incompleto' },
};

interface Props {
  product: Product | null;
  currency: string;
  onBack: () => void;
}

export function StepResult({ product, currency, onBack }: Props) {
  const r = useResultStep(product);

  return (
    <div className={styles.step}>
      <header className={styles.stepHeader}>
        <span className={styles.doneIcon} aria-hidden="true">
          <Icon name="check" size={28} />
        </span>
        <h1 className={styles.stepTitle}>
          {product ? 'Este es su resultado' : '¡Su negocio está listo!'}
        </h1>
        <p className={styles.stepDescription}>
          {product
            ? 'Así se ve un producto en AImargen: cuánto cuesta, a cuánto venderlo y cuánto gana.'
            : 'Cuando agregue ingredientes y recetas verá aquí el costo, el precio sugerido y su margen.'}
        </p>
      </header>

      {product &&
        (r.detail.isPending ? (
          <div className={styles.resultCard} aria-busy="true">
            <Skeleton height={24} width="50%" />
            <Skeleton height={64} />
            <Skeleton height={12} />
          </div>
        ) : r.detail.error ? (
          <Notice tone="danger" title="No pudimos cargar el resultado">
            {r.detail.error.message}
          </Notice>
        ) : (
          <ResultCard detail={r.detail.data} currency={currency} />
        ))}

      {r.finishError && <Notice tone="danger" title={r.finishError} />}

      <div className={styles.stepActions}>
        <Button
          variant="secondary"
          size="lg"
          icon="chevronLeft"
          onClick={onBack}
          disabled={r.finishing}
          className={styles.backButton}
        >
          Atrás
        </Button>
        <Button
          size="lg"
          icon="arrowRight"
          loading={r.finishing}
          onClick={r.finish}
          className={styles.primaryButton}
        >
          Ir a mi panel
        </Button>
      </div>
    </div>
  );
}

function ResultCard({ detail, currency }: { detail: ProductDetail; currency: string }) {
  const cost = detail.breakdown.costPerPortion ?? detail.costPerPortion;
  const current = detail.analysis?.current ?? null;
  const suggested = detail.analysis?.byMargin ?? null;
  const shown = current?.price && current.margin ? current : suggested;
  const status = STATUS[detail.pricing.status];
  const target = detail.effectiveTargetMargin;

  return (
    <section className={styles.resultCard} aria-labelledby="result-name">
      <div className={styles.resultHead}>
        <h2 id="result-name" className={styles.resultName}>
          {detail.name}
        </h2>
        <StatusBadge tone={status.tone}>{status.text}</StatusBadge>
      </div>
      <StatGrid>
        <Stat label="Costo por porción" value={cost ? formatMoney(cost, currency) : '—'} />
        <Stat
          label="Precio sugerido"
          value={suggested?.price ? formatMoney(suggested.price, currency) : '—'}
          caption={target ? `Para ganar ${formatPercent(target)}` : undefined}
        />
      </StatGrid>
      {shown?.price && shown.margin && cost && (
        <div className={styles.resultBar}>
          <p className={styles.resultBarLabel}>
            {shown === current ? 'Su precio actual' : 'Con el precio sugerido'}:{' '}
            <span className="num">{formatMoney(shown.price, currency)}</span>
          </p>
          <MarginBar
            cost={cost}
            price={shown.price}
            margin={shown.margin}
            target={target}
            currency={currency}
          />
          {current?.price && current.profit && (
            <p className={styles.resultProfit}>
              Gana <strong className="num">{formatMoney(current.profit, currency)}</strong> por
              porción vendiendo a{' '}
              <span className="num">{formatMoney(current.price, currency)}</span>.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
