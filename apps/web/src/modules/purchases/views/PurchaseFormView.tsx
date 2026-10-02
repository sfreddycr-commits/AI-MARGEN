import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Actions,
  Button,
  Card,
  FormGrid,
  Icon,
  IconButton,
  Notice,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useSession, useTenant } from '../../../core/session/js/session-context';
import { currencySymbol, formatMoney, unitLabel } from '../../../core/js/format';
import {
  lineUnitOptions,
  usePurchaseForm,
  useSupplierOptions,
  type PurchaseLine,
} from '../js/use-purchases';
import { isUnitCode } from '../../ingredients/js/units';
import { IngredientPickerSheet } from './IngredientPickerSheet';
import styles from '../css/purchases.module.css';

export default function PurchaseFormView() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const { can } = useSession();
  const { currency } = useTenant();
  const suppliers = useSupplierOptions();
  const form = usePurchaseForm(params.get('supplier'), (p) => {
    toast.show('Compra registrada. Costos y recetas actualizados.');
    navigate(`/app/purchases/${p.uuid}`, { replace: true });
  });
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const { header, errors } = form;
  const symbol = currencySymbol(currency);

  return (
    <Page title="Registrar compra" back="/app/purchases">
      <form
        noValidate
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          form.submit();
        }}
      >
        <Notice tone="info" title="Al guardar se actualizan sus costos">
          El costo de cada ingrediente pasa a ser el de esta compra y sus recetas se recalculan. El
          historial anterior se conserva.
        </Notice>
        {form.formError && <Notice tone="danger" title={form.formError} />}
        {errors.items && <Notice tone="danger" title={errors.items} />}

        <Card title="Datos de la compra">
          <FormGrid>
            <TextField
              label="Fecha"
              type="date"
              value={header.purchasedAt}
              onChange={(e) => form.setHeaderField('purchasedAt', e.target.value)}
              error={errors.purchasedAt}
              required
            />
            <SelectField
              label="Proveedor"
              value={header.supplierUuid}
              onChange={(e) => form.setHeaderField('supplierUuid', e.target.value)}
              error={errors.supplierUuid}
              placeholder="Sin proveedor"
              options={suppliers}
            />
            <TextField
              label="Número de factura o referencia"
              value={header.reference}
              onChange={(e) => form.setHeaderField('reference', e.target.value)}
              error={errors.reference}
              placeholder="Opcional"
            />
          </FormGrid>
          <TextAreaField
            label="Notas"
            rows={2}
            value={header.notes}
            onChange={(e) => form.setHeaderField('notes', e.target.value)}
            error={errors.notes}
          />
        </Card>

        <section className={styles.lines} aria-labelledby="purchase-lines-title">
          <h2 id="purchase-lines-title" className={styles.sectionTitle}>
            Lo que compró
          </h2>
          {form.lines.map((line, idx) => (
            <LineCard
              key={line.key}
              line={line}
              index={idx}
              errors={errors}
              symbol={symbol}
              canRemove={form.lines.length > 1 || line.ingredient !== null}
              onPick={() => setPickerFor(line.key)}
              onChange={(patch) => form.updateLine(line.key, patch)}
              onRemove={() => form.removeLine(line.key)}
            />
          ))}
          <div>
            <Button variant="secondary" icon="plus" onClick={form.addLine}>
              Agregar línea
            </Button>
          </div>
        </section>

        <div className={styles.footerBar}>
          <div className={styles.totalBox}>
            <span className={styles.totalLabel}>Total escrito</span>
            <span className={`num ${styles.totalValue}`}>
              {form.total === null ? '—' : formatMoney(form.total, currency)}
            </span>
          </div>
          <Actions>
            <Button
              variant="secondary"
              className={styles.cancel}
              onClick={() => navigate(-1)}
              disabled={form.saving}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={form.saving}>
              Guardar compra
            </Button>
          </Actions>
        </div>
      </form>

      <IngredientPickerSheet
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        canCreate={can('ingredients.write')}
        onPick={(i) => {
          if (pickerFor !== null) form.pickIngredient(pickerFor, i);
          setPickerFor(null);
        }}
      />
    </Page>
  );
}

function LineCard({
  line,
  index,
  errors,
  symbol,
  canRemove,
  onPick,
  onChange,
  onRemove,
}: {
  line: PurchaseLine;
  index: number;
  errors: Record<string, string>;
  symbol: string;
  canRemove: boolean;
  onPick: () => void;
  onChange: (patch: Partial<PurchaseLine>) => void;
  onRemove: () => void;
}) {
  const err = (k: string) => errors[`items.${index}.${k}`];
  const ingError = err('ingredientUuid');
  return (
    <fieldset className={styles.line}>
      <legend className="srOnly">Línea {index + 1}</legend>
      <div className={styles.lineHead}>
        <span className={styles.lineNumber} aria-hidden="true">
          {index + 1}
        </span>
        <button
          type="button"
          className={`${styles.pickerButton} ${ingError ? styles.pickerInvalid : ''}`}
          onClick={onPick}
          aria-invalid={ingError ? true : undefined}
          aria-describedby={ingError ? `line-${line.key}-ing-error` : undefined}
        >
          <span className={line.ingredient ? styles.pickerValue : styles.pickerPlaceholder}>
            {line.ingredient ? line.ingredient.name : 'Elegir ingrediente'}
          </span>
          {line.ingredient && (
            <span className={styles.pickerUnit}>Costo por {unitLabel(line.ingredient.unit)}</span>
          )}
          <Icon name="chevronDown" size={18} />
        </button>
        {canRemove && (
          <IconButton icon="trash" label={`Quitar línea ${index + 1}`} onClick={onRemove} />
        )}
      </div>
      {ingError && (
        <p id={`line-${line.key}-ing-error`} className={styles.lineError} role="alert">
          <Icon name="alert" size={16} />
          {ingError}
        </p>
      )}
      <div className={styles.lineFields}>
        <NumberField
          label="Cantidad"
          value={line.quantity}
          onChange={(e) => onChange({ quantity: e.target.value })}
          error={err('quantity')}
          placeholder="0"
        />
        <SelectField
          label="Unidad"
          value={line.unit}
          onChange={(e) => isUnitCode(e.target.value) && onChange({ unit: e.target.value })}
          error={err('unit')}
          placeholder={line.ingredient ? undefined : '—'}
          options={lineUnitOptions(line)}
          disabled={!line.ingredient}
        />
        <NumberField
          label="Total pagado"
          kind="money"
          currencySymbol={symbol}
          value={line.lineTotal}
          onChange={(e) => onChange({ lineTotal: e.target.value })}
          error={err('lineTotal')}
          placeholder="0"
        />
      </div>
    </fieldset>
  );
}
