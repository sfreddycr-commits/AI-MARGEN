import {
  EmptyState,
  MarginBar,
  NumberField,
  SelectField,
  Skeleton,
  StatusBadge,
  TextField,
  Button,
  Icon,
} from '../../../core/ui';
import { formatMoney } from '../../../core/js/format';
import type { Ingredient, Product, ProductPreview } from '../js/onboarding.service';
import { useRecipeStep, type UnitCode } from '../js/use-onboarding';
import { StepFrame } from './StepFrame';
import styles from '../css/onboarding.module.css';

interface Props {
  created: Ingredient | null;
  /** Receta ya guardada en este asistente (volvió atrás desde el resultado). */
  saved: Product | null;
  onNext: () => void;
  currency: string;
  onDone: (p: Product) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function StepRecipe({ saved, onNext, ...rest }: Props) {
  if (saved) {
    return (
      <StepFrame
        title="Su primera receta"
        description="Ya la guardamos. Puede editarla o agregar más desde Productos."
        submitLabel="Ver resultado"
        onSubmit={onNext}
        onBack={rest.onBack}
      >
        <div className={styles.savedCard}>
          <span className={styles.savedIcon} aria-hidden="true">
            <Icon name="check" size={20} />
          </span>
          <p className={styles.savedName}>{saved.name}</p>
        </div>
      </StepFrame>
    );
  }
  return <RecipeForm {...rest} />;
}

function RecipeForm({
  created,
  currency,
  onDone,
  onBack,
  onSkip,
}: Omit<Props, 'saved' | 'onNext'>) {
  const s = useRecipeStep(created, onDone);
  const symbol = currency === 'CRC' ? '₡' : currency;

  if (!s.ingredientsLoading && s.ingredients.length === 0) {
    return (
      <div className={styles.step}>
        <EmptyState
          icon="ingredients"
          title="Primero necesita un ingrediente"
          description="La receta se arma con ingredientes. Agregue uno y vuelva a este paso."
          action={
            <Button icon="plus" onClick={onBack}>
              Agregar ingrediente
            </Button>
          }
        />
        <div className={styles.stepActions}>
          <Button variant="ghost" size="lg" onClick={onSkip}>
            Omitir por ahora
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StepFrame
      title="Arme su primera receta"
      description="Un plato o producto que venda. Por ahora con un ingrediente; luego puede completar la receta."
      submitLabel="Guardar receta"
      submitting={s.saving}
      onSubmit={s.submit}
      onBack={onBack}
      onSkip={onSkip}
      formError={s.formError}
    >
      <TextField
        label="Nombre del producto"
        placeholder="Ej.: Gallo pinto"
        enterKeyHint="next"
        value={s.values.name}
        onChange={(e) => s.set('name', e.target.value)}
        error={s.errors.name}
        required
        autoFocus
      />
      <NumberField
        label="Porciones que rinde"
        hint="Cuántos platos o unidades salen de esta receta."
        value={s.values.portions}
        onChange={(e) => s.set('portions', e.target.value)}
        error={s.errors.portions}
      />
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Ingrediente de la receta</legend>
        {s.ingredientsLoading ? (
          <Skeleton height={48} />
        ) : (
          <SelectField
            label="Ingrediente"
            options={s.ingredients.map((i) => ({ value: i.uuid, label: i.name }))}
            value={s.values.ingredientUuid}
            onChange={(e) => s.set('ingredientUuid', e.target.value)}
            error={s.errors['items.0.ingredientUuid']}
          />
        )}
        <div className={styles.pair}>
          <NumberField
            label="Cantidad que usa"
            placeholder="Ej.: 150"
            value={s.values.quantity}
            onChange={(e) => s.set('quantity', e.target.value)}
            error={s.errors['items.0.quantity'] ?? s.errors.items}
          />
          <SelectField
            label="Unidad"
            options={s.recipeUnits}
            value={s.values.unit}
            onChange={(e) => s.set('unit', e.target.value as UnitCode)}
            error={s.errors['items.0.unit']}
          />
        </div>
      </fieldset>
      <NumberField
        kind="money"
        currencySymbol={symbol}
        label="Precio de venta actual (opcional)"
        hint="Si ya lo vende, escriba el precio para ver cuánto le está ganando."
        value={s.values.price}
        onChange={(e) => s.set('price', e.target.value)}
        error={s.errors.currentPrice}
      />
      <PreviewPanel
        preview={s.preview}
        loading={s.previewLoading}
        error={s.previewError}
        currency={currency}
      />
    </StepFrame>
  );
}

function PreviewPanel({
  preview,
  loading,
  error,
  currency,
}: {
  preview: ProductPreview | undefined;
  loading: boolean;
  error: string | null;
  currency: string;
}) {
  return (
    <section className={styles.preview} aria-live="polite" aria-busy={loading || undefined}>
      <h2 className={styles.previewTitle}>Cálculo en vivo</h2>
      {error ? (
        <p className={styles.previewHint}>{error}</p>
      ) : !preview ? (
        loading ? (
          <Skeleton height={44} />
        ) : (
          <p className={styles.previewHint}>
            Escriba la cantidad del ingrediente y verá aquí el costo por porción.
          </p>
        )
      ) : (
        <>
          <dl className={styles.figures}>
            <div>
              <dt>Costo por porción</dt>
              <dd className="num">
                {preview.breakdown.costPerPortion
                  ? formatMoney(preview.breakdown.costPerPortion, currency)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Precio sugerido</dt>
              <dd className="num">
                {preview.pricing.recommendedPrice
                  ? formatMoney(preview.pricing.recommendedPrice, currency)
                  : '—'}
              </dd>
            </div>
          </dl>
          {preview.analysis?.current?.margin && preview.analysis.current.price && (
            <p className={styles.previewHint}>
              Con su precio de{' '}
              <span className="num">{formatMoney(preview.analysis.current.price, currency)}</span>:
            </p>
          )}
          {preview.analysis?.current?.margin && preview.analysis.current.price && (
            <MarginBar
              cost={preview.breakdown.costPerPortion ?? '0'}
              price={preview.analysis.current.price}
              margin={preview.analysis.current.margin}
              target={preview.effectiveTargetMargin}
              currency={currency}
            />
          )}
          {!preview.breakdown.complete && (
            <StatusBadge tone="warning">Falta el costo de algún ingrediente</StatusBadge>
          )}
        </>
      )}
    </section>
  );
}
