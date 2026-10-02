import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Actions,
  Button,
  Card,
  Checkbox,
  FormGrid,
  Notice,
  NumberField,
  SelectField,
  Sheet,
  TextAreaField,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { useSession, useTenant } from '../../../core/session/js/session-context';
import { currencySymbol } from '../../../core/js/format';
import {
  toFormValues,
  useCreateCategory,
  useIngredient,
  useIngredientCategories,
  useSaveIngredient,
  useSupplierOptions,
  type IngredientFormValues,
} from '../js/use-ingredients';
import { UNIT_OPTIONS, isUnitCode, unitOptionsFor, type UnitCode } from '../js/units';
import type { Ingredient } from '../js/ingredients.service';
import { ConversionsEditor } from './ConversionsEditor';
import styles from '../css/ingredients.module.css';

export default function IngredientFormView() {
  const { uuid } = useParams();
  const existing = useIngredient(uuid);
  if (uuid && existing.isPending) return <PageSkeleton />;
  if (uuid && existing.error) {
    return (
      <Page title="Ingrediente" back="/app/ingredients">
        <Notice tone="danger" title="No se encontró el ingrediente">
          {existing.error.message}
        </Notice>
      </Page>
    );
  }
  return <IngredientForm key={uuid ?? 'new'} existing={uuid ? existing.data : null} />;
}

function IngredientForm({ existing }: { existing: Ingredient | null | undefined }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useSession();
  const { currency } = useTenant();
  const [values, setValues] = useState<IngredientFormValues>(() => toFormValues(existing));
  const categories = useIngredientCategories();
  const suppliers = useSupplierOptions();
  const [catSheet, setCatSheet] = useState(false);
  const [catName, setCatName] = useState('');
  const category = useCreateCategory((c) => {
    setValues((v) => ({ ...v, categoryUuid: c.uuid }));
    setCatSheet(false);
    setCatName('');
    toast.show('Categoría creada');
  });
  const { submit, errors, formError, saving } = useSaveIngredient(existing, (i) => {
    toast.show(existing ? 'Ingrediente actualizado' : 'Ingrediente creado');
    navigate(`/app/ingredients/${i.uuid}`, { replace: true });
  });

  const set =
    <K extends keyof IngredientFormValues>(k: K) =>
    (value: IngredientFormValues[K]) =>
      setValues((v) => ({ ...v, [k]: value }));
  const text =
    (k: 'name' | 'notes' | 'yieldPct' | 'costPrice' | 'costQuantity' | 'costDate') =>
    (e: { target: { value: string } }) =>
      set(k)(e.target.value);

  const costUnits = unitOptionsFor(
    values.unit,
    values.conversions.map((c) => ({ from: c.from, to: c.to, factor: '1' })),
  );
  const changeUnit = (unit: UnitCode) =>
    setValues((v) => ({
      ...v,
      unit,
      costUnit: unitOptionsFor(
        unit,
        v.conversions.map((c) => ({ ...c, factor: '1' })),
      ).some((o) => o.value === v.costUnit)
        ? v.costUnit
        : unit,
    }));
  const unitLocked = !!existing?.lastCostAt;
  const categoryOptions = (categories.data ?? []).map((c) => ({ value: c.uuid, label: c.name }));
  if (existing?.categoryUuid && !categoryOptions.some((o) => o.value === existing.categoryUuid)) {
    categoryOptions.push({
      value: existing.categoryUuid,
      label: existing.categoryName ?? 'Categoría actual',
    });
  }

  return (
    <Page
      title={existing ? 'Editar ingrediente' : 'Nuevo ingrediente'}
      back={existing ? `/app/ingredients/${existing.uuid}` : '/app/ingredients'}
    >
      <form
        noValidate
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit(values);
        }}
      >
        {formError && <Notice tone="danger" title={formError} />}
        <Card title="Datos básicos">
          <FormGrid>
            <TextField
              label="Nombre"
              value={values.name}
              onChange={text('name')}
              error={errors.name}
              required
              autoFocus={!existing}
              placeholder="Ej.: Harina, Carne molida, Huevo"
            />
            <div className={styles.categoryField}>
              <SelectField
                label="Categoría"
                value={values.categoryUuid}
                onChange={(e) => set('categoryUuid')(e.target.value)}
                error={errors.categoryUuid}
                placeholder="Sin categoría"
                options={categoryOptions}
              />
              {can('ingredients.write') && (
                <Button
                  variant="ghost"
                  icon="plus"
                  className={styles.inlineAction}
                  onClick={() => {
                    category.reset();
                    setCatSheet(true);
                  }}
                >
                  Nueva categoría
                </Button>
              )}
            </div>
            <SelectField
              label="Unidad base"
              hint={
                unitLocked
                  ? 'Ya tiene costos registrados; para otra unidad cree un ingrediente nuevo.'
                  : 'La unidad en que se calcula el costo y se usa en recetas.'
              }
              value={values.unit}
              onChange={(e) => isUnitCode(e.target.value) && changeUnit(e.target.value)}
              error={errors.unit}
              options={UNIT_OPTIONS}
              disabled={unitLocked}
            />
            <NumberField
              label="Rendimiento"
              kind="percent"
              hint="Lo aprovechable después de limpiar o pelar. 100% si no tiene merma."
              value={values.yieldPct}
              onChange={text('yieldPct')}
              error={errors.yield}
            />
          </FormGrid>
          <TextAreaField
            label="Notas"
            hint="Marca, presentación o cualquier detalle útil."
            value={values.notes}
            onChange={text('notes')}
            error={errors.notes}
          />
        </Card>

        <Card title="Equivalencias">
          <p className={styles.help}>
            Si compra o usa este ingrediente en otra medida, indique cuánto equivale. Ej.: 1 unidad
            = 60 g. No hace falta para kg ↔ g ni L ↔ ml.
          </p>
          <ConversionsEditor
            unit={values.unit}
            rows={values.conversions}
            errors={errors}
            onChange={(rows) => set('conversions')(rows)}
          />
        </Card>

        {!existing && (
          <Card title="Costo inicial">
            <Checkbox
              label="Registrar el costo ahora"
              description="Indique cuánto pagó por una cantidad. El sistema calcula el costo por unidad."
              checked={values.withInitialCost}
              onChange={(e) => set('withInitialCost')(e.target.checked)}
            />
            {values.withInitialCost && (
              <FormGrid>
                <NumberField
                  label="Precio pagado"
                  kind="money"
                  currencySymbol={currencySymbol(currency)}
                  value={values.costPrice}
                  onChange={text('costPrice')}
                  error={errors['initialCost.price']}
                  placeholder="10.000"
                />
                <div className={styles.qtyUnit}>
                  <NumberField
                    label="Cantidad"
                    value={values.costQuantity}
                    onChange={text('costQuantity')}
                    error={errors['initialCost.quantity']}
                  />
                  <SelectField
                    label="Unidad"
                    value={values.costUnit}
                    onChange={(e) => isUnitCode(e.target.value) && set('costUnit')(e.target.value)}
                    error={errors['initialCost.unit']}
                    options={costUnits}
                  />
                </div>
                <SelectField
                  label="Proveedor"
                  value={values.costSupplier}
                  onChange={(e) => set('costSupplier')(e.target.value)}
                  error={errors['initialCost.supplierUuid']}
                  placeholder="Sin proveedor"
                  options={suppliers}
                />
                <TextField
                  label="Fecha"
                  type="date"
                  value={values.costDate}
                  onChange={text('costDate')}
                  error={errors['initialCost.date']}
                />
              </FormGrid>
            )}
          </Card>
        )}

        <Actions>
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {existing ? 'Guardar cambios' : 'Crear ingrediente'}
          </Button>
        </Actions>
      </form>

      <Sheet
        open={catSheet}
        onClose={() => setCatSheet(false)}
        title="Nueva categoría"
        footer={
          <Actions>
            <Button
              variant="secondary"
              onClick={() => setCatSheet(false)}
              disabled={category.saving}
            >
              Cancelar
            </Button>
            <Button loading={category.saving} onClick={() => category.create(catName)}>
              Crear categoría
            </Button>
          </Actions>
        }
      >
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            category.create(catName);
          }}
        >
          <TextField
            label="Nombre de la categoría"
            placeholder="Ej.: Lácteos, Carnes, Verduras"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            error={category.error ?? undefined}
            autoFocus
          />
        </form>
      </Sheet>
    </Page>
  );
}
