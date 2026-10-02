import { NumberField } from '../../../core/ui';
import { COST_METHOD_OPTIONS, useSettingsStep } from '../js/use-onboarding';
import { StepFrame } from './StepFrame';
import styles from '../css/onboarding.module.css';

export function StepSettings({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const s = useSettingsStep(onDone);
  return (
    <StepFrame
      title="Su meta de ganancia"
      description="Con estos datos le sugerimos precios. Puede ajustarlos cuando quiera."
      submitLabel="Guardar y continuar"
      submitting={s.saving}
      onSubmit={s.submit}
      onBack={onBack}
      formError={s.formError}
    >
      <NumberField
        kind="percent"
        label="Margen objetivo"
        hint="Qué parte del precio de venta quiere que le quede después de pagar los ingredientes. Muchos negocios de comida usan entre 30 % y 40 %."
        value={s.values.targetMargin}
        onChange={(e) => s.set('targetMargin', e.target.value)}
        error={s.errors.targetMargin}
        autoFocus
      />
      <NumberField
        label="Días que abre al mes"
        hint="Se usa para calcular ventas mínimas y punto de equilibrio."
        suffix="días"
        value={s.values.operatingDays}
        onChange={(e) => s.set('operatingDays', e.target.value)}
        error={s.errors.operatingDays}
      />
      <fieldset className={styles.choices}>
        <legend className={styles.legend}>¿Cómo calculamos el costo de sus ingredientes?</legend>
        {COST_METHOD_OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`${styles.choice} ${s.values.costMethod === o.value ? styles.choiceActive : ''}`}
          >
            <input
              type="radio"
              name="costMethod"
              value={o.value}
              checked={s.values.costMethod === o.value}
              onChange={() => s.set('costMethod', o.value)}
              className={styles.choiceInput}
            />
            <span className={styles.choiceText}>
              <span className={styles.choiceLabel}>{o.label}</span>
              <span className={styles.choiceDescription}>{o.description}</span>
            </span>
          </label>
        ))}
        {s.errors.costMethod && <p className={styles.error}>{s.errors.costMethod}</p>}
      </fieldset>
    </StepFrame>
  );
}
