import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  Actions,
  Button,
  Card,
  ConfirmSheet,
  KeyValue,
  Notice,
  NumberField,
  Segmented,
  SelectField,
  Skeleton,
  StatusBadge,
  TextAreaField,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { useTenant } from '../../../core/session/js/session-context';
import { errorMessage } from '../../../core/js/api-client';
import { currencySymbol, formatMoney, formatPercent } from '../../../core/js/format';
import { formatInputNumber, inputToDecimal } from '../../../core/js/form';
import {
  nudge,
  toScenarioForm,
  useArchiveScenario,
  useDefaultDays,
  useFixedCosts,
  useScenario,
  useScenarioEditor,
  useScenarioProducts,
  type FixedMode,
  type ScenarioFormValues,
  type VariableMode,
} from '../js/use-scenarios';
import type { Scenario, ScenarioResult } from '../js/scenarios.service';
import styles from '../css/scenarios.module.css';

export default function ScenarioEditorView() {
  const { uuid } = useParams();
  const [params] = useSearchParams();
  const existing = useScenario(uuid);
  const products = useScenarioProducts();
  const days = useDefaultDays();

  if ((uuid && existing.isPending) || (!uuid && products.isPending)) return <PageSkeleton />;
  if (uuid && (existing.error || !existing.data)) {
    return (
      <Page title="Escenario" back="/app/scenarios">
        <Notice tone="danger" title="No se encontró el escenario">
          {existing.error?.message}
        </Notice>
      </Page>
    );
  }
  const scenario = uuid ? (existing.data ?? null) : null;
  const preselect = params.get('product');
  const product = preselect ? (products.data ?? []).find((p) => p.uuid === preselect) : null;
  const initial = toScenarioForm(scenario, { days, product });
  return (
    <ScenarioEditor key={uuid ?? `new-${preselect ?? ''}`} existing={scenario} initial={initial} />
  );
}

function ScenarioEditor({
  existing,
  initial,
}: {
  existing: Scenario | null;
  initial: ScenarioFormValues;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { can, currency } = useTenant();
  const canWrite = can('scenarios.write');
  const fixed = useFixedCosts();
  const archive = useArchiveScenario();
  const [confirm, setConfirm] = useState(false);
  const ed = useScenarioEditor(existing, initial, (s) => {
    toast.show(existing ? 'Escenario actualizado' : 'Escenario guardado');
    if (!existing) navigate(`/app/scenarios/${s.uuid}`, { replace: true });
  });
  const v = ed.values;
  const symbol = currencySymbol(currency).trim();

  /** Error del envío o, mientras escribe, el de un campo que ya tiene texto. */
  const fieldError = (k: keyof ScenarioFormValues & string) => {
    if (ed.errors[k]) return ed.errors[k];
    const text = v[k];
    return typeof text === 'string' && text.trim() ? ed.liveErrors[k] : undefined;
  };
  const productHasCost = !!ed.product?.costPerPortion;
  const readOnly = !canWrite || !!existing?.archived;

  const doArchive = () => {
    if (!existing) return;
    archive.mutate(existing.uuid, {
      onSuccess: () => {
        setConfirm(false);
        toast.show('Escenario archivado');
        navigate('/app/scenarios', { replace: true });
      },
      onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
    });
  };

  return (
    <Page
      title={existing ? existing.name : 'Nuevo escenario'}
      description="Cambie el precio o las ventas por día y vea al instante si cubre sus costos."
      back="/app/scenarios"
    >
      {existing?.archived && (
        <Notice tone="warning" title="Escenario archivado">
          Puede consultarlo, pero ya no se puede modificar.
        </Notice>
      )}
      <form
        noValidate
        className={styles.editor}
        onSubmit={(e) => {
          e.preventDefault();
          if (!readOnly) ed.submit();
        }}
      >
        <div className={styles.editorForm}>
          <Card title="Supuestos">
            {ed.formError && <Notice tone="danger" title={ed.formError} />}
            <TextField
              label="Nombre del escenario"
              placeholder="Ej. Temporada alta"
              value={v.name}
              onChange={(e) => ed.set('name', e.target.value)}
              error={ed.errors.name}
              required
              disabled={readOnly}
            />
            <SelectField
              label="Producto (opcional)"
              hint="Al elegirlo se usan su precio y su costo por porción."
              value={v.productUuid}
              onChange={(e) => ed.selectProduct(e.target.value)}
              placeholder="Sin producto: escribo los valores"
              options={ed.products.map((p) => ({ value: p.uuid, label: p.name }))}
              disabled={readOnly}
            />
            <div className={styles.nudgeField}>
              <NumberField
                kind="money"
                currencySymbol={symbol}
                label="Precio de venta por unidad"
                value={v.price}
                onChange={(e) => ed.set('price', e.target.value)}
                error={fieldError('price')}
                disabled={readOnly}
              />
              {!readOnly && (
                <Nudges label="precio" onNudge={(f) => ed.set('price', nudge(v.price, f, 2))} />
              )}
            </div>

            {productHasCost && (
              <Segmented<VariableMode>
                label="Costo variable por unidad"
                value={v.variableMode}
                onChange={(m) => ed.set('variableMode', m)}
                options={[
                  { value: 'product', label: 'Del producto' },
                  { value: 'manual', label: 'Otro monto' },
                ]}
              />
            )}
            {productHasCost && v.variableMode === 'product' ? (
              <KeyValue
                label="Costo por porción de la receta"
                hint="Se actualiza solo cuando cambian sus ingredientes."
                value={formatMoney(ed.product!.costPerPortion!, currency)}
              />
            ) : (
              <NumberField
                kind="money"
                currencySymbol={symbol}
                label={productHasCost ? 'Otro costo por unidad' : 'Costo variable por unidad'}
                hint="Lo que le cuesta producir cada unidad (ingredientes, empaque)."
                value={v.variableUnitCost}
                onChange={(e) => ed.set('variableUnitCost', e.target.value)}
                error={fieldError('variableUnitCost')}
                disabled={readOnly}
              />
            )}

            <div className={styles.pair}>
              <div className={styles.nudgeField}>
                <NumberField
                  label="Unidades vendidas por día"
                  value={v.unitsPerDay}
                  onChange={(e) => ed.set('unitsPerDay', e.target.value)}
                  error={fieldError('unitsPerDay')}
                  disabled={readOnly}
                />
                {!readOnly && (
                  <Nudges
                    label="unidades"
                    onNudge={(f) => ed.set('unitsPerDay', nudge(v.unitsPerDay, f, 0))}
                  />
                )}
              </div>
              <NumberField
                label="Días de venta al mes"
                hint="Entre 1 y 31."
                value={v.daysPerMonth}
                onChange={(e) => ed.set('daysPerMonth', e.target.value)}
                error={fieldError('daysPerMonth')}
                disabled={readOnly}
              />
            </div>

            <Segmented<FixedMode>
              label="Costos fijos al mes"
              value={v.fixedMode}
              onChange={(m) => ed.set('fixedMode', m)}
              options={[
                { value: 'business', label: 'Los del negocio' },
                { value: 'custom', label: 'Otro monto' },
              ]}
            />
            {v.fixedMode === 'business' ? (
              <KeyValue
                label="Total de costos fijos"
                hint={
                  <button
                    type="button"
                    className={styles.inlineLink}
                    onClick={() => navigate('/app/fixed-costs')}
                  >
                    Ver o editar costos fijos
                  </button>
                }
                value={fixed.total === null ? '—' : formatMoney(fixed.total, currency)}
              />
            ) : (
              <NumberField
                kind="money"
                currencySymbol={symbol}
                label="Costos fijos de este escenario"
                hint="Alquiler, salarios, servicios… solo para esta simulación."
                value={v.fixedCosts}
                onChange={(e) => ed.set('fixedCosts', e.target.value)}
                error={fieldError('fixedCosts')}
                disabled={readOnly}
              />
            )}
            <TextAreaField
              label="Notas"
              value={v.notes}
              onChange={(e) => ed.set('notes', e.target.value)}
              error={ed.errors.notes}
              disabled={readOnly}
            />
          </Card>
        </div>

        <div className={styles.editorResults}>
          <Results
            result={ed.result}
            ready={ed.ready}
            calculating={ed.calculating}
            calcError={ed.calcError}
            unitsPerDay={v.unitsPerDay}
            currency={currency}
          />
          {!readOnly && (
            <Actions>
              {existing && (
                <Button variant="ghost" icon="archive" onClick={() => setConfirm(true)}>
                  Archivar
                </Button>
              )}
              <Button type="submit" loading={ed.saving} icon="check">
                {existing ? 'Guardar cambios' : 'Guardar escenario'}
              </Button>
            </Actions>
          )}
        </div>
      </form>

      <ConfirmSheet
        open={confirm}
        title="¿Archivar escenario?"
        message={
          <p>Dejará de aparecer en su lista y en el resumen. Sus recetas y precios no cambian.</p>
        }
        confirmLabel="Archivar"
        danger
        loading={archive.isPending}
        onConfirm={doArchive}
        onClose={() => setConfirm(false)}
      />
    </Page>
  );
}

function Nudges({ label, onNudge }: { label: string; onNudge: (factor: string) => void }) {
  return (
    <div className={styles.nudges} role="group" aria-label={`Ajustar ${label}`}>
      <button type="button" className={styles.nudge} onClick={() => onNudge('0.9')}>
        −10 %
      </button>
      <button type="button" className={styles.nudge} onClick={() => onNudge('1.1')}>
        +10 %
      </button>
    </div>
  );
}

function Results({
  result,
  ready,
  calculating,
  calcError,
  unitsPerDay,
  currency,
}: {
  result: ScenarioResult | undefined;
  ready: boolean;
  calculating: boolean;
  calcError: string | null;
  unitsPerDay: string;
  currency: string;
}) {
  const money = (x: string | null | undefined) =>
    typeof x === 'string' ? formatMoney(x, currency) : '—';
  if (!ready) {
    return (
      <Card title="Resultado del mes">
        <p className={styles.muted}>
          Escriba el precio, el costo por unidad y cuántas unidades vende por día para ver el
          resultado.
        </p>
      </Card>
    );
  }
  if (calcError) {
    return (
      <Notice tone="danger" title="No se pudo calcular">
        {calcError}
      </Notice>
    );
  }
  if (!result) {
    return (
      <Card title="Resultado del mes">
        <Skeleton height={48} />
        <Skeleton height={120} />
      </Card>
    );
  }
  const profit = Number(result.profit ?? 0);
  const tone = profit < 0 ? 'danger' : profit > 0 ? 'positive' : 'warning';
  return (
    <Card
      title="Resultado del mes"
      action={
        <span className={styles.calcState} aria-live="polite">
          {calculating ? 'Calculando…' : 'Actualizado'}
        </span>
      }
    >
      <div className={styles.profitBox} data-tone={tone}>
        <span className={styles.profitLabel}>Utilidad estimada</span>
        <span className={`num ${styles.profitValue}`}>{money(result.profit)}</span>
        <StatusBadge tone={tone}>
          {profit < 0 ? 'Con pérdida' : profit > 0 ? 'Con ganancia' : 'En equilibrio'}
          {result.margin !== null && ` · margen ${formatPercent(result.margin)}`}
        </StatusBadge>
      </div>

      <BreakEvenBar unitsPerDay={unitsPerDay} breakEvenPerDay={result.breakEvenUnitsPerDay} />

      <div>
        <KeyValue
          label="Unidades al mes"
          value={result.unitsPerMonth ? formatInputNumber(result.unitsPerMonth) : '—'}
        />
        <KeyValue label="Ventas" value={money(result.revenue)} />
        <KeyValue
          label="Costos variables"
          hint={
            result.inputs.variableSource === 'product'
              ? `${money(result.inputs.variableUnitCost)} por unidad, de la receta`
              : `${money(result.inputs.variableUnitCost)} por unidad`
          }
          value={money(result.variableCosts)}
        />
        <KeyValue
          label="Costos fijos"
          hint={
            result.inputs.fixedCostsSource === 'business'
              ? 'Los del negocio'
              : 'Monto de este escenario'
          }
          value={money(result.fixedCosts)}
        />
        <KeyValue label="Costos totales" value={money(result.totalCosts)} />
        <KeyValue label="Utilidad" value={money(result.profit)} strong />
      </div>

      <div>
        <h3 className={styles.subTitle}>Punto de equilibrio</h3>
        {result.breakEven ? (
          <>
            <KeyValue label="Unidades al mes" value={`${result.breakEven.unitsRounded} unid.`} />
            <KeyValue
              label="Unidades por día"
              value={
                result.breakEvenUnitsPerDay
                  ? `${formatInputNumber(result.breakEvenUnitsPerDay)} unid.`
                  : '—'
              }
            />
            <KeyValue label="Ventas necesarias" value={money(result.breakEven.revenue)} />
            <KeyValue
              label="Ganancia por unidad"
              hint="Precio menos costo variable"
              value={money(result.breakEven.contributionPerUnit)}
            />
          </>
        ) : (
          <p className={styles.muted}>
            No hay punto de equilibrio: con este precio cada unidad cuesta lo mismo o más de lo que
            se cobra.
          </p>
        )}
      </div>

      {result.warnings.map((w) => (
        <Notice key={w.code} tone="warning" title={w.message} />
      ))}
    </Card>
  );
}

/** Ventas por día frente a las necesarias para no perder (solo presentación). */
function BreakEvenBar({
  unitsPerDay,
  breakEvenPerDay,
}: {
  unitsPerDay: string;
  breakEvenPerDay: string | null;
}) {
  const actual = Number(inputToDecimal(unitsPerDay) ?? 0);
  if (!breakEvenPerDay) return null;
  const needed = Number(breakEvenPerDay);
  const max = Math.max(actual, needed, 1) * 1.15;
  const actualPct = (actual / max) * 100;
  const neededPct = (needed / max) * 100;
  const ok = actual >= needed;
  const label = `Vende ${formatInputNumber(String(actual))} por día; necesita ${formatInputNumber(breakEvenPerDay)} para no perder.`;
  return (
    <figure className={styles.beWrap}>
      <svg
        className={styles.beSvg}
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
      >
        <rect x="0" y="4" width="100" height="12" rx="3" className={styles.beTrack} />
        <rect
          x="0"
          y="4"
          width={actualPct}
          height="12"
          rx="3"
          className={ok ? styles.beFillOk : styles.beFillLow}
        />
        <line x1={neededPct} x2={neededPct} y1="0" y2="20" className={styles.beMark} />
      </svg>
      <figcaption className={styles.beLegend}>
        <span>
          <span className={styles.beDot} data-kind={ok ? 'ok' : 'low'} aria-hidden="true" />
          Vende <strong className="num">{formatInputNumber(String(actual))}</strong> por día
        </span>
        <span>
          <span className={styles.beLine} aria-hidden="true" />
          Necesita <strong className="num">{formatInputNumber(breakEvenPerDay)}</strong>
        </span>
      </figcaption>
    </figure>
  );
}
