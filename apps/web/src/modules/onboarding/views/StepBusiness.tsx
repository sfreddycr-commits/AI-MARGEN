import { SelectField, TextField } from '../../../core/ui';
import { BUSINESS_TYPE_OPTIONS, useBusinessStep, type BusinessType } from '../js/use-onboarding';
import { StepFrame } from './StepFrame';
import styles from '../css/onboarding.module.css';

export function StepBusiness({ userName, onDone }: { userName: string; onDone: () => void }) {
  const s = useBusinessStep(onDone);
  const firstName = userName.split(' ')[0];
  return (
    <StepFrame
      title={firstName ? `¡Hola, ${firstName}! Cuéntenos de su negocio` : 'Cuéntenos de su negocio'}
      description="Con esto preparamos AImargen para usted. Le toma menos de un minuto."
      submitLabel="Continuar"
      submitting={s.saving}
      onSubmit={s.submit}
      formError={s.formError}
    >
      <TextField
        label="Nombre del negocio"
        placeholder="Ej.: Soda La Esquina"
        autoComplete="organization"
        enterKeyHint="next"
        value={s.values.name}
        onChange={(e) => s.set('name', e.target.value)}
        error={s.errors.name}
        required
        autoFocus
      />
      <SelectField
        label="Tipo de negocio"
        placeholder="Elija una opción"
        options={BUSINESS_TYPE_OPTIONS}
        value={s.values.businessType}
        onChange={(e) => s.set('businessType', e.target.value as BusinessType | '')}
        error={s.errors.businessType}
        required
      />
      <p className={styles.aside}>
        Usaremos Costa Rica, colones (₡) y la hora de Costa Rica. Puede cambiarlo después en
        Configuración.
      </p>
    </StepFrame>
  );
}
