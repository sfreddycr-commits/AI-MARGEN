import { Icon, NumberField, SelectField, TextField } from '../../../core/ui';
import { formatMoney, unitLabel } from '../../../core/js/format';
import type { Ingredient } from '../js/onboarding.service';
import { UNIT_OPTIONS, useIngredientStep, type UnitCode } from '../js/use-onboarding';
import { StepFrame } from './StepFrame';
import styles from '../css/onboarding.module.css';

interface Props {
  created: Ingredient | null;
  currency: string;
  onDone: (i: Ingredient) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function StepIngredient({ created, currency, onDone, onNext, onBack, onSkip }: Props) {
  // Si ya lo creó (volvió atrás), no se crea otro: se muestra el resultado.
  if (created) {
    return (
      <StepFrame
        title="Su primer ingrediente"
        description="Ya lo guardamos. Puede agregar más desde Ingredientes."
        submitLabel="Continuar"
        onSubmit={onNext}
        onBack={onBack}
      >
        <div className={styles.savedCard}>
          <span className={styles.savedIcon} aria-hidden="true">
            <Icon name="check" size={20} />
          </span>
          <div>
            <p className={styles.savedName}>{created.name}</p>
            <p className={styles.savedMeta}>
              Costo:{' '}
              <span className="num">
                {created.unitCost ? formatMoney(created.unitCost, currency) : '—'}
              </span>{' '}
              por {unitLabel(created.unit)}
            </p>
          </div>
        </div>
      </StepFrame>
    );
  }
  return <IngredientForm currency={currency} onDone={onDone} onBack={onBack} onSkip={onSkip} />;
}

function IngredientForm({ currency, onDone, onBack, onSkip }: Omit<Props, 'created' | 'onNext'>) {
  const s = useIngredientStep(onDone);
  return (
    <StepFrame
      title="Agregue su primer ingrediente"
      description="Elija algo que use mucho, como arroz, pollo o queso. Solo necesitamos lo que pagó en su última compra."
      submitLabel="Guardar ingrediente"
      submitting={s.saving}
      onSubmit={s.submit}
      onBack={onBack}
      onSkip={onSkip}
      formError={s.formError}
    >
      <TextField
        label="Nombre del ingrediente"
        placeholder="Ej.: Arroz"
        enterKeyHint="next"
        value={s.values.name}
        onChange={(e) => s.set('name', e.target.value)}
        error={s.errors.name}
        required
        autoFocus
      />
      <SelectField
        label="¿En qué unidad lo mide?"
        hint="La unidad con la que piensa en este ingrediente."
        options={UNIT_OPTIONS}
        value={s.values.unit}
        onChange={(e) => s.set('unit', e.target.value as UnitCode)}
        error={s.errors.unit}
      />
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Su última compra</legend>
        <NumberField
          kind="money"
          currencySymbol={currency === 'CRC' ? '₡' : currency}
          label="Cuánto pagó"
          placeholder="Ej.: 10.000"
          value={s.values.price}
          onChange={(e) => s.set('price', e.target.value)}
          error={s.errors['initialCost.price']}
        />
        <div className={styles.pair}>
          <NumberField
            label="Por cuánta cantidad"
            value={s.values.quantity}
            onChange={(e) => s.set('quantity', e.target.value)}
            error={s.errors['initialCost.quantity']}
          />
          <SelectField
            label="Unidad de compra"
            options={s.purchaseUnits}
            value={s.values.purchaseUnit}
            onChange={(e) => s.set('purchaseUnit', e.target.value as UnitCode)}
            error={s.errors['initialCost.unit']}
          />
        </div>
        <p className={styles.aside}>Ejemplo: pagó ₡10.000 por 5 kg de arroz.</p>
      </fieldset>
    </StepFrame>
  );
}
