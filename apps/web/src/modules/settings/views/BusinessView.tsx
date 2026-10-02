import { useState } from 'react';
import { BUSINESS_TYPES } from '@aimargen/schemas';
import {
  Actions,
  Button,
  Card,
  FormGrid,
  Notice,
  SelectField,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { useSession } from '../../../core/session/js/session-context';
import type { Tenant } from '../../../core/session/js/session-types';
import {
  toBusinessValues,
  useSaveBusiness,
  useTenantProfile,
  type BusinessFormValues,
} from '../js/use-settings';
import {
  BUSINESS_TYPE_LABELS,
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
  withCurrent,
} from '../js/settings-labels';
import styles from '../css/settings.module.css';

export default function BusinessView() {
  const { data, isPending, error } = useTenantProfile();
  if (isPending) return <PageSkeleton />;
  if (error || !data) {
    return (
      <Page title="Datos del negocio" back="/app/settings">
        <Notice tone="danger" title="No se pudieron cargar los datos del negocio">
          {error?.message}
        </Notice>
      </Page>
    );
  }
  return <BusinessForm key={data.rowVersion} tenant={data} />;
}

function BusinessForm({ tenant }: { tenant: Tenant }) {
  const toast = useToast();
  const { can } = useSession();
  const canEdit = can('tenant.update');
  const [values, setValues] = useState<BusinessFormValues>(() => toBusinessValues(tenant));
  const { submit, errors, formError, saving } = useSaveBusiness(tenant, () =>
    toast.show('Datos del negocio guardados'),
  );
  const set = (k: keyof BusinessFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const dirty = JSON.stringify(values) !== JSON.stringify(toBusinessValues(tenant));

  return (
    <Page
      title="Datos del negocio"
      description="Así aparece su negocio en reportes y documentos."
      back="/app/settings"
    >
      {!canEdit && (
        <Notice tone="info" title="Solo lectura">
          Su rol puede ver estos datos, pero no cambiarlos.
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
            <Card title="Identificación">
              <FormGrid>
                <TextField
                  label="Nombre comercial"
                  value={values.name}
                  onChange={set('name')}
                  error={errors.name}
                  autoComplete="organization"
                  required
                />
                <TextField
                  label="Razón social"
                  hint="Opcional. Nombre legal para facturas."
                  value={values.legalName}
                  onChange={set('legalName')}
                  error={errors.legalName}
                />
                <SelectField
                  label="Tipo de negocio"
                  value={values.businessType}
                  onChange={set('businessType')}
                  error={errors.businessType}
                  options={BUSINESS_TYPES.map((b) => ({
                    value: b,
                    label: BUSINESS_TYPE_LABELS[b],
                  }))}
                />
              </FormGrid>
            </Card>
            <Card title="Contacto">
              <FormGrid>
                <TextField
                  label="Correo del negocio"
                  type="email"
                  inputMode="email"
                  value={values.email}
                  onChange={set('email')}
                  error={errors.email}
                  autoComplete="email"
                />
                <TextField
                  label="Teléfono"
                  type="tel"
                  inputMode="tel"
                  value={values.phone}
                  onChange={set('phone')}
                  error={errors.phone}
                  autoComplete="tel"
                />
              </FormGrid>
            </Card>
            <Card title="Región">
              <FormGrid>
                <SelectField
                  label="País"
                  value={values.country}
                  onChange={set('country')}
                  error={errors.country}
                  options={withCurrent(COUNTRY_OPTIONS, values.country)}
                />
                <SelectField
                  label="Moneda"
                  hint="Moneda en la que se muestran costos y precios."
                  value={values.currency}
                  onChange={set('currency')}
                  error={errors.currency}
                  options={withCurrent(CURRENCY_OPTIONS, values.currency)}
                />
                <SelectField
                  label="Zona horaria"
                  value={values.timezone}
                  onChange={set('timezone')}
                  error={errors.timezone}
                  options={withCurrent(TIMEZONE_OPTIONS, values.timezone)}
                />
              </FormGrid>
              {values.currency !== tenant.currency && (
                <Notice tone="warning" title="Cambio de moneda">
                  Los montos ya registrados no se convierten: solo cambia el símbolo con que se
                  muestran.
                </Notice>
              )}
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
