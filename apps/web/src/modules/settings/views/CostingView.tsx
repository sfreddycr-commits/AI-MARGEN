import { useState } from 'react';
import { COST_METHODS } from '@aimargen/schemas';
import {
  Actions,
  Button,
  Card,
  FormGrid,
  Notice,
  NumberField,
  SelectField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { useSession } from '../../../core/session/js/session-context';
import type { TenantSettings } from '../../../core/session/js/session-types';
import {
  toCostingValues,
  useCostingSettings,
  useSaveCosting,
  type CostingFormValues,
} from '../js/use-settings';
import { COST_METHOD_INFO } from '../js/settings-labels';
import styles from '../css/settings.module.css';

const ROUNDING_OPTIONS = [0, 1, 2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label:
    n === 0 ? 'Sin decimales (₡1.667)' : n === 2 ? '2 decimales (recomendado)' : `${n} decimales`,
}));

export default function CostingView() {
  const { data, isPending, error } = useCostingSettings();
  if (isPending) return <PageSkeleton />;
  if (error || !data) {
    return (
      <Page title="Costeo y márgenes" back="/app/settings">
        <Notice tone="danger" title="No se pudo cargar la configuración">
          {error?.message}
        </Notice>
      </Page>
    );
  }
  return <CostingForm key={data.rowVersion} settings={data} />;
}

function CostingForm({ settings }: { settings: TenantSettings }) {
  const toast = useToast();
  const { can } = useSession();
  const canEdit = can('settings.update');
  const [values, setValues] = useState<CostingFormValues>(() => toCostingValues(settings));
  const { submit, errors, formError, saving } = useSaveCosting(settings, () =>
    toast.show('Configuración de costeo guardada'),
  );
  const set = (k: keyof CostingFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const dirty = JSON.stringify(values) !== JSON.stringify(toCostingValues(settings));

  return (
    <Page
      title="Costeo y márgenes"
      description="Estas reglas se usan en todos los cálculos de costo, precio y margen."
      back="/app/settings"
    >
      {!canEdit && (
        <Notice tone="info" title="Solo lectura">
          Su rol puede ver esta configuración, pero no cambiarla.
        </Notice>
      )}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(values);
        }}
      >
        <fieldset disabled={!canEdit || saving} className={styles.options}>
          <div className={styles.stack}>
            {formError && <Notice tone="danger" title={formError} />}
            <Card title="Metas">
              <FormGrid>
                <NumberField
                  kind="percent"
                  label="Margen objetivo"
                  hint="Cuánto de cada precio de venta quiere que le quede después del costo. Ej.: 35."
                  value={values.targetMargin}
                  onChange={set('targetMargin')}
                  error={errors.targetMargin}
                />
                <NumberField
                  label="Días que abre al mes"
                  hint="Se usa para repartir los costos fijos (alquiler, salarios) por día."
                  value={values.operatingDays}
                  onChange={set('operatingDays')}
                  error={errors.operatingDays}
                  suffix="días"
                />
              </FormGrid>
            </Card>
            <Card title="Cómo se calcula el costo de los ingredientes">
              <fieldset className={styles.options}>
                <legend className="srOnly">Método de costo</legend>
                {COST_METHODS.map((m) => (
                  <label key={m} className={styles.option}>
                    <input
                      type="radio"
                      name="costMethod"
                      className={styles.radio}
                      value={m}
                      checked={values.costMethod === m}
                      onChange={() => setValues((v) => ({ ...v, costMethod: m }))}
                    />
                    <span className={styles.optionText}>
                      <span className={styles.optionTitle}>{COST_METHOD_INFO[m].label}</span>
                      <span className={styles.optionDescription}>
                        {COST_METHOD_INFO[m].description}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {errors.costMethod && <Notice tone="danger" title={errors.costMethod} />}
            </Card>
            <Card title="Redondeo">
              <SelectField
                label="Decimales en los montos calculados"
                hint="Afecta cómo se redondean costos y precios sugeridos. En colones lo usual son 2."
                value={values.roundingScale}
                onChange={set('roundingScale')}
                error={errors.roundingScale}
                options={ROUNDING_OPTIONS}
              />
            </Card>
            {canEdit && (
              <Actions>
                <Button type="submit" loading={saving} disabled={!dirty}>
                  Guardar cambios
                </Button>
              </Actions>
            )}
          </div>
        </fieldset>
      </form>
    </Page>
  );
}
