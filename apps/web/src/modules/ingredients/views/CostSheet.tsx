import { useState } from 'react';
import {
  Actions,
  Button,
  FormGrid,
  Notice,
  NumberField,
  SelectField,
  Sheet,
  TextField,
  useToast,
} from '../../../core/ui';
import { currencySymbol } from '../../../core/js/format';
import {
  emptyCostValues,
  useAddCost,
  useSupplierOptions,
  type CostFormValues,
} from '../js/use-ingredients';
import { isUnitCode, unitOptionsFor } from '../js/units';
import type { Ingredient } from '../js/ingredients.service';
import styles from '../css/ingredients.module.css';

/** Hoja para registrar un costo sin compra (cotización, precio de mercado). */
export function CostSheet({
  open,
  onClose,
  ingredient,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  ingredient: Ingredient;
  currency: string;
}) {
  const toast = useToast();
  const suppliers = useSupplierOptions();
  const [values, setValues] = useState<CostFormValues>(() => emptyCostValues(ingredient));
  const cost = useAddCost(ingredient, () => {
    toast.show('Costo registrado. Las recetas se recalcularon.');
    setValues(emptyCostValues(ingredient));
    onClose();
  });
  const set =
    <K extends keyof CostFormValues>(k: K) =>
    (value: CostFormValues[K]) =>
      setValues((v) => ({ ...v, [k]: value }));
  const close = () => {
    cost.reset();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Registrar costo"
      footer={
        <Actions>
          <Button variant="secondary" onClick={close} disabled={cost.saving}>
            Cancelar
          </Button>
          <Button type="submit" form="ingredient-cost-form" loading={cost.saving}>
            Guardar costo
          </Button>
        </Actions>
      }
    >
      <form
        id="ingredient-cost-form"
        noValidate
        className={styles.sheetForm}
        onSubmit={(e) => {
          e.preventDefault();
          cost.submit(values);
        }}
      >
        <p className={styles.help}>
          Indique cuánto pagó (o le cotizaron) por una cantidad. Ej.: ₡10.000 por 5 kg. El sistema
          calcula el costo por unidad y actualiza sus recetas.
        </p>
        {cost.formError && <Notice tone="danger" title={cost.formError} />}
        <FormGrid columns={1}>
          <NumberField
            label="Precio pagado"
            kind="money"
            currencySymbol={currencySymbol(currency)}
            value={values.price}
            onChange={(e) => set('price')(e.target.value)}
            error={cost.errors.price}
            autoFocus
          />
          <div className={styles.qtyUnit}>
            <NumberField
              label="Cantidad"
              value={values.quantity}
              onChange={(e) => set('quantity')(e.target.value)}
              error={cost.errors.quantity}
            />
            <SelectField
              label="Unidad"
              value={values.unit}
              onChange={(e) => isUnitCode(e.target.value) && set('unit')(e.target.value)}
              error={cost.errors.unit}
              options={unitOptionsFor(ingredient.unit, ingredient.conversions)}
            />
          </div>
          <SelectField
            label="Proveedor"
            value={values.supplierUuid}
            onChange={(e) => set('supplierUuid')(e.target.value)}
            error={cost.errors.supplierUuid}
            placeholder="Sin proveedor"
            options={suppliers}
          />
          <TextField
            label="Fecha"
            type="date"
            value={values.date}
            onChange={(e) => set('date')(e.target.value)}
            error={cost.errors.date}
          />
        </FormGrid>
      </form>
    </Sheet>
  );
}
