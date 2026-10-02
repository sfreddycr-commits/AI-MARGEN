import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Actions,
  Button,
  Card,
  FormGrid,
  Icon,
  IconButton,
  Notice,
  NumberField,
  Segmented,
  SelectField,
  Sheet,
  TextAreaField,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { useTenant } from '../../../core/session/js/session-context';
import {
  currencySymbol,
  formatDecimal,
  formatMoney,
  formatPercent,
  unitLabel,
} from '../../../core/js/format';
import { fractionToPercentInput } from '../../../core/js/form';
import { useLocalList } from '../../../core/data/js/use-entity';
import {
  priceToInput,
  unitsFor,
  useCreateCategory,
  useProductDetail,
  useRecipeEditor,
  type ComponentValues,
  type LineValues,
  type RecipeEditor,
} from '../js/use-products';
import type { Category, IngredientOption, ProductDetail } from '../js/products.service';
import { CostPanel } from './CostPanel';
import styles from '../css/products.module.css';

export default function ProductFormView() {
  const { uuid } = useParams();
  const existing = useProductDetail(uuid);
  if (uuid && existing.isPending) return <PageSkeleton />;
  if (uuid && (existing.error || !existing.data)) {
    return (
      <Page title="Producto" back="/app/products">
        <Notice tone="danger" title="No se encontró el producto">
          {existing.error?.message}
        </Notice>
      </Page>
    );
  }
  return <RecipeForm key={uuid ?? 'new'} existing={uuid ? (existing.data ?? null) : null} />;
}

const NEW_CATEGORY = '__new__';

function RecipeForm({ existing }: { existing: ProductDetail | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { tenant, currency } = useTenant();
  const ed = useRecipeEditor(existing, (p) => {
    toast.show(existing ? 'Receta actualizada' : 'Producto creado');
    navigate(`/app/products/${p.uuid}`, { replace: true });
  });
  const categories = useLocalList<Category>('product_categories');
  const [catSheet, setCatSheet] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const hasExtras =
    !!existing &&
    [existing.packaging, existing.labor, existing.overhead].some((c) => Number(c.value) > 0);
  const [extrasOpen, setExtrasOpen] = useState(hasExtras || Number(existing?.wastePct ?? 0) > 0);
  const { values, errors } = ed;

  // Al fallar la validación se lleva el foco al primer campo con error.
  useEffect(() => {
    if (!ed.formError) return;
    const el = document.querySelector<HTMLElement>('form [aria-invalid="true"]');
    (el ?? document.querySelector<HTMLElement>('main h1'))?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [ed.formError, errors]);
  const backTo = existing ? `/app/products/${existing.uuid}` : '/app/products';
  const defaultMargin = fractionToPercentInput(tenant.settings.targetMargin);

  const usePrice = (price: string) => {
    ed.set('currentPrice', priceToInput(price));
    setSummaryOpen(false);
    toast.show('Precio sugerido aplicado al formulario', { tone: 'info' });
  };

  const panel = (
    <CostPanel
      preview={ed.preview}
      pending={ed.previewPending}
      invalid={ed.previewInvalid}
      error={ed.previewError}
      hasLines={ed.hasLines}
      currency={currency}
      onUsePrice={usePrice}
    />
  );

  const categoryOptions = [
    ...(categories.data ?? []).map((c) => ({ value: c.uuid, label: c.name })),
    { value: NEW_CATEGORY, label: '+ Nueva categoría…' },
  ];

  return (
    <Page title={existing ? 'Editar receta' : 'Nuevo producto'} back={backTo}>
      <div className={styles.editor}>
        <form
          noValidate
          className={styles.editorForm}
          onSubmit={(e) => {
            e.preventDefault();
            ed.submit();
          }}
        >
          {ed.formError && <Notice tone="danger" title={ed.formError} />}

          <Card title="Producto">
            <FormGrid>
              <TextField
                label="Nombre"
                value={values.name}
                onChange={(e) => ed.set('name', e.target.value)}
                error={errors.name}
                required
                autoFocus={!existing}
                placeholder="Ej.: Queque de vainilla"
              />
              <SelectField
                label="Categoría"
                value={values.categoryUuid}
                placeholder="Sin categoría"
                options={categoryOptions}
                error={errors.categoryUuid}
                onChange={(e) => {
                  if (e.target.value === NEW_CATEGORY) setCatSheet(true);
                  else ed.set('categoryUuid', e.target.value);
                }}
              />
              <NumberField
                label="Porciones que rinde"
                hint="Cuántas unidades vendibles salen de esta receta."
                value={values.portions}
                onChange={(e) => ed.set('portions', e.target.value)}
                error={errors.portions}
                required
              />
            </FormGrid>
          </Card>

          <Card title="Ingredientes">
            <IngredientLines ed={ed} currency={currency} />
          </Card>

          <section className={styles.extras}>
            <button
              type="button"
              className={styles.extrasToggle}
              aria-expanded={extrasOpen}
              onClick={() => setExtrasOpen((o) => !o)}
            >
              <span>
                <span className={styles.extrasTitle}>Costos adicionales</span>
                <span className={styles.extrasHint}>Empaque, mano de obra, indirectos y merma</span>
              </span>
              <Icon
                name="chevronDown"
                size={20}
                className={extrasOpen ? styles.chevronOpen : styles.chevron}
              />
            </button>
            {extrasOpen && (
              <div className={styles.extrasBody}>
                <ComponentField
                  label="Empaque"
                  value={values.packaging}
                  onChange={(v) => ed.set('packaging', v)}
                  error={errors['packaging.value']}
                  currency={currency}
                />
                <ComponentField
                  label="Mano de obra"
                  value={values.labor}
                  onChange={(v) => ed.set('labor', v)}
                  error={errors['labor.value']}
                  currency={currency}
                />
                <ComponentField
                  label="Indirectos (gas, luz, agua…)"
                  value={values.overhead}
                  onChange={(v) => ed.set('overhead', v)}
                  error={errors['overhead.value']}
                  currency={currency}
                />
                <NumberField
                  kind="percent"
                  label="Merma de la receta"
                  hint="Lo que se pierde al preparar, como % del costo de ingredientes."
                  value={values.wastePct}
                  onChange={(e) => ed.set('wastePct', e.target.value)}
                  error={errors.wastePct}
                  placeholder="0"
                />
              </div>
            )}
          </section>

          <Card title="Precio">
            <FormGrid>
              <NumberField
                kind="money"
                currencySymbol={currencySymbol(currency).trim()}
                label="Precio de venta actual"
                hint="Opcional. Puede usar un precio sugerido del panel de costo."
                value={values.currentPrice}
                onChange={(e) => ed.set('currentPrice', e.target.value)}
                error={errors.currentPrice}
              />
              <NumberField
                kind="percent"
                label="Margen objetivo"
                hint={
                  defaultMargin
                    ? `Si lo deja vacío se usa el margen del negocio (${defaultMargin}%).`
                    : 'Qué parte del precio quiere que sea ganancia.'
                }
                placeholder={defaultMargin || undefined}
                value={values.targetMargin}
                onChange={(e) => ed.set('targetMargin', e.target.value)}
                error={errors.targetMargin}
              />
              <NumberField
                label="Multiplicador (opcional)"
                hint="Si usted fija precios multiplicando el costo, ej. × 3."
                prefix="×"
                value={values.multiplier}
                onChange={(e) => ed.set('multiplier', e.target.value)}
                error={errors.multiplier}
              />
            </FormGrid>
            <TextAreaField
              label="Notas"
              hint="Preparación, presentación u otros detalles."
              value={values.notes}
              onChange={(e) => ed.set('notes', e.target.value)}
              error={errors.notes}
            />
          </Card>

          <Actions>
            <Button variant="secondary" onClick={() => navigate(backTo)} disabled={ed.saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={ed.saving}>
              {existing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </Actions>
        </form>

        <aside className={styles.editorAside} aria-label="Costo en vivo">
          <Card title="Costo en vivo">{panel}</Card>
        </aside>
      </div>

      <MobileSummary ed={ed} currency={currency} onOpen={() => setSummaryOpen(true)} />
      <Sheet open={summaryOpen} onClose={() => setSummaryOpen(false)} title="Costo en vivo">
        {panel}
      </Sheet>

      <NewCategorySheet
        open={catSheet}
        onClose={() => setCatSheet(false)}
        onCreated={(c) => {
          ed.set('categoryUuid', c.uuid);
          setCatSheet(false);
          toast.show('Categoría creada');
        }}
      />
    </Page>
  );
}

function ingredientLabel(i: IngredientOption, currency: string): string {
  const cost = i.effectiveUnitCost ?? i.unitCost;
  return cost
    ? `${i.name} · ${formatMoney(cost, currency)}/${unitLabel(i.unit)}`
    : `${i.name} · sin costo`;
}

function IngredientLines({ ed, currency }: { ed: RecipeEditor; currency: string }) {
  const { items, byUuid, isPending } = ed.ingredients;
  const active = items.filter((i) => !i.archived);
  if (!isPending && items.length === 0) {
    return (
      <Notice
        tone="info"
        title="Primero registre sus ingredientes"
        action={
          <Link to="/app/ingredients/new" className={styles.inlineLink}>
            Agregar ingrediente
          </Link>
        }
      >
        Las recetas se arman con ingredientes que ya tienen costo.
      </Notice>
    );
  }
  return (
    <div className={styles.lines}>
      {ed.errors.items && <p className={styles.fieldError}>{ed.errors.items}</p>}
      <ol className={styles.lineList}>
        {ed.values.lines.map((l, idx) => (
          <IngredientLine
            key={l.key}
            line={l}
            index={idx}
            ed={ed}
            options={active}
            ingredient={byUuid.get(l.ingredientUuid)}
            currency={currency}
          />
        ))}
      </ol>
      <Button variant="ghost" icon="plus" onClick={ed.addLine}>
        Agregar ingrediente
      </Button>
    </div>
  );
}

function IngredientLine({
  line,
  index,
  ed,
  options,
  ingredient,
  currency,
}: {
  line: LineValues;
  index: number;
  ed: RecipeEditor;
  options: IngredientOption[];
  ingredient: IngredientOption | undefined;
  currency: string;
}) {
  const err = (f: string) => ed.errors[`line.${line.key}.${f}`];
  const units = unitsFor(ingredient);
  const lc = ed.lineCosts.get(line.key);
  // Si el ingrediente ya está archivado se mantiene visible en el selector.
  const opts = ingredient && ingredient.archived ? [ingredient, ...options] : options;
  return (
    <li className={styles.line}>
      <div className={styles.lineHead}>
        <span className={styles.lineIndex}>{index + 1}</span>
        <SelectField
          className={styles.lineIngredient}
          label="Ingrediente"
          value={line.ingredientUuid}
          placeholder="Elija un ingrediente"
          options={opts.map((i) => ({
            value: i.uuid,
            label: i.archived
              ? `${ingredientLabel(i, currency)} (archivado)`
              : ingredientLabel(i, currency),
          }))}
          onChange={(e) => ed.setLine(line.key, { ingredientUuid: e.target.value })}
          error={err('ingredientUuid')}
        />
        <IconButton
          icon="trash"
          label={`Quitar ingrediente ${index + 1}`}
          onClick={() => ed.removeLine(line.key)}
          className={styles.lineRemove}
        />
      </div>
      {line.ingredientUuid && (
        <div className={styles.lineBody}>
          <NumberField
            label="Cantidad"
            value={line.quantity}
            onChange={(e) => ed.setLine(line.key, { quantity: e.target.value })}
            error={err('quantity')}
          />
          <SelectField
            label="Unidad"
            value={line.unit}
            options={units.map((u) => ({ value: u, label: unitLabel(u) }))}
            onChange={(e) => ed.setLine(line.key, { unit: e.target.value })}
            error={err('unit')}
          />
          <div className={styles.lineCost}>
            <span className={styles.panelLabel}>Costo</span>
            {lc ? (
              lc.missing ? (
                <span className={styles.lineMissing}>
                  <Icon name="alert" size={16} /> Sin costo
                </span>
              ) : (
                <span className="num">{formatMoney(lc.cost ?? '0', currency)}</span>
              )
            ) : (
              <span className={styles.muted}>—</span>
            )}
          </div>
        </div>
      )}
      {ingredient && !ingredient.unitCost && (
        <p className={styles.lineHint}>
          {ingredient.name} aún no tiene costo.{' '}
          <Link to={`/app/ingredients/${ingredient.uuid}`} className={styles.inlineLink}>
            Registrar costo
          </Link>
        </p>
      )}
    </li>
  );
}

function ComponentField({
  label,
  value,
  onChange,
  error,
  currency,
}: {
  label: string;
  value: ComponentValues;
  onChange: (v: ComponentValues) => void;
  error?: string;
  currency: string;
}) {
  const symbol = currencySymbol(currency).trim();
  return (
    <div className={styles.component}>
      <Segmented
        label={label}
        value={value.mode}
        onChange={(mode) => onChange({ mode, value: '' })}
        options={[
          { value: 'fixed', label: `Monto fijo ${symbol}` },
          { value: 'percent', label: '% de ingredientes' },
        ]}
      />
      <NumberField
        kind={value.mode === 'fixed' ? 'money' : 'percent'}
        currencySymbol={symbol}
        label={
          value.mode === 'fixed'
            ? `${label}: monto por receta`
            : `${label}: % del costo de ingredientes`
        }
        value={value.value}
        placeholder="0"
        onChange={(e) => onChange({ ...value, value: e.target.value })}
        error={error}
      />
    </div>
  );
}

function MobileSummary({
  ed,
  currency,
  onOpen,
}: {
  ed: RecipeEditor;
  currency: string;
  onOpen: () => void;
}) {
  const p = ed.preview;
  const margin = p?.analysis?.current?.margin ?? null;
  const cpp = p?.breakdown.costPerPortion ?? null;
  return (
    <button type="button" className={styles.summaryBar} onClick={onOpen} aria-haspopup="dialog">
      <span className={styles.summaryItem}>
        <span className={styles.panelLabel}>Costo/porción</span>
        <span className={`num ${styles.summaryValue}`}>
          {ed.hasLines && cpp !== null ? formatMoney(cpp, currency) : '—'}
          {ed.previewPending && ed.hasLines && <span className={styles.dot} aria-hidden="true" />}
        </span>
      </span>
      <span className={styles.summaryItem}>
        <span className={styles.panelLabel}>Margen</span>
        <span
          className={`num ${styles.summaryValue} ${margin !== null && Number(margin) < 0 ? styles.loss : ''}`}
        >
          {margin !== null ? formatPercent(margin) : '—'}
        </span>
      </span>
      {p && !p.breakdown.complete && ed.hasLines && (
        <span className={styles.summaryWarn}>
          <Icon name="alert" size={16} /> Incompleto
        </span>
      )}
      <span className={styles.summaryMore}>
        <span className={styles.summaryMoreText} aria-hidden="true">
          Desglose
        </span>
        <span className="srOnly">Ver desglose del costo</span>
        <Icon name="chevronDown" size={18} className={styles.chevronUp} />
      </span>
      {p?.analysis?.byMargin?.price && (
        <span className="srOnly">
          Precio sugerido {formatDecimal(p.analysis.byMargin.price, 2)}
        </span>
      )}
    </button>
  );
}

function NewCategorySheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (c: Category) => void;
}) {
  const [name, setName] = useState('');
  const cat = useCreateCategory((c) => {
    setName('');
    onCreated(c);
  });
  return (
    <Sheet
      open={open}
      onClose={() => {
        cat.reset();
        onClose();
      }}
      title="Nueva categoría"
      footer={
        <Actions>
          <Button variant="secondary" onClick={onClose} disabled={cat.saving}>
            Cancelar
          </Button>
          <Button loading={cat.saving} onClick={() => cat.create(name)}>
            Crear categoría
          </Button>
        </Actions>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          cat.create(name);
        }}
      >
        <TextField
          label="Nombre de la categoría"
          placeholder="Ej.: Bebidas"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={cat.error ?? undefined}
          autoFocus
        />
      </form>
    </Sheet>
  );
}
