import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { UNIT_CODES } from '@aimargen/schemas';
import {
  Actions,
  Button,
  Card,
  ConfirmSheet,
  FormGrid,
  Icon,
  KeyValue,
  Notice,
  NumberField,
  SelectField,
  Stat,
  StatGrid,
  StatusBadge,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { useSession, useTenant } from '../../../core/session/js/session-context';
import { errorMessage } from '../../../core/js/api-client';
import {
  currencySymbol,
  formatDate,
  formatDecimal,
  formatMoney,
  formatPercent,
  unitLabel,
} from '../../../core/js/format';
import {
  NEW,
  SKIP,
  useDiscardDraft,
  useDraft,
  useDraftDocument,
  usePurchaseDraftForm,
  useRecipeDraftForm,
  useScenarioDraftForm,
} from '../js/use-ai';
import type {
  AiDraft,
  PurchaseDraftPayload,
  RecipeDraftPayload,
  ScenarioDraftPayload,
} from '../js/ai.service';
import { DraftStatusBadge, SafetyNote } from './AiParts';
import styles from '../css/ai.module.css';

const TITLES = {
  purchase: 'Revisar compra',
  recipe: 'Revisar receta',
  scenario: 'Revisar escenario',
} as const;

const RESULT_PATH = {
  purchase: '/app/purchases/',
  recipe: '/app/products/',
  scenario: '/app/scenarios/',
} as const;

const WRITE_PERM = {
  purchase: 'purchases.write',
  recipe: 'products.write',
  scenario: 'scenarios.write',
} as const;

const unitOptions = UNIT_CODES.map((u) => ({ value: u, label: unitLabel(u) }));

export default function AiDraftView() {
  const { uuid } = useParams();
  const { data: draft, isPending, error } = useDraft(uuid);
  if (isPending) return <PageSkeleton />;
  if (error || !draft) {
    return (
      <Page title="Borrador" back="/app/ai">
        <Notice tone="danger" title="No se encontró el borrador">
          {error ? errorMessage(error) : null}
        </Notice>
      </Page>
    );
  }
  return <DraftScreen draft={draft} />;
}

function DraftScreen({ draft }: { draft: AiDraft }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useSession();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const discard = useDiscardDraft(draft.uuid, () => {
    setConfirmDiscard(false);
    toast.show('Borrador descartado');
    navigate('/app/ai');
  });
  const kind = draft.kind;
  const pending = draft.status === 'pending' && !draft.expired;
  const canConfirm = can('ai.confirm_actions') && can(WRITE_PERM[kind]);

  const onSaved = (resultUuid: string) => {
    toast.show(
      kind === 'purchase'
        ? 'Compra registrada'
        : kind === 'recipe'
          ? 'Receta creada'
          : 'Escenario guardado',
    );
    navigate(`${RESULT_PATH[kind]}${resultUuid}`, { replace: true });
  };

  const footer = (submit: () => void, saving: boolean) =>
    pending && (
      <div className={styles.stickyActions}>
        <Actions>
          <Button
            variant="secondary"
            icon="trash"
            onClick={() => setConfirmDiscard(true)}
            disabled={saving}
          >
            Descartar
          </Button>
          {canConfirm && (
            <Button icon="check" onClick={submit} loading={saving}>
              Confirmar y guardar
            </Button>
          )}
        </Actions>
      </div>
    );

  return (
    <Page title={TITLES[kind] ?? 'Borrador'} back="/app/ai">
      <div className={styles.draftHeader}>
        <SafetyNote />
        <div className={styles.draftMetaRow}>
          <DraftStatusBadge draft={draft} />
          {draft.createdAt && (
            <span className={styles.muted}>Propuesto el {formatDate(draft.createdAt)}</span>
          )}
        </div>
      </div>

      {draft.status === 'confirmed' && (
        <Notice
          tone="positive"
          title="Este borrador ya fue confirmado"
          action={
            draft.resultUuid && (
              <Button
                variant="secondary"
                onClick={() => navigate(`${RESULT_PATH[kind]}${draft.resultUuid}`)}
              >
                Ver registro
              </Button>
            )
          }
        >
          Lo que se guardó está en su registro correspondiente.
        </Notice>
      )}
      {draft.status === 'discarded' && (
        <Notice tone="info" title="Este borrador fue descartado">
          No se guardó nada. Puede generar uno nuevo desde AImargen AI.
        </Notice>
      )}
      {draft.status === 'pending' && draft.expired && (
        <Notice tone="warning" title="El borrador venció">
          Por seguridad los borradores vencen. Genérelo de nuevo para guardarlo.
        </Notice>
      )}
      {pending && !canConfirm && (
        <Notice tone="info" title="Su rol no permite confirmar este borrador">
          Pida al dueño o a un administrador que lo revise y lo confirme.
        </Notice>
      )}

      {kind === 'purchase' && (
        <PurchaseDraft
          draft={draft as unknown as AiDraft<PurchaseDraftPayload>}
          readOnly={!pending}
          onSaved={onSaved}
          footer={footer}
        />
      )}
      {kind === 'recipe' && (
        <RecipeDraft
          draft={draft as unknown as AiDraft<RecipeDraftPayload>}
          readOnly={!pending}
          onSaved={onSaved}
          footer={footer}
        />
      )}
      {kind === 'scenario' && (
        <ScenarioDraft
          draft={draft as unknown as AiDraft<ScenarioDraftPayload>}
          readOnly={!pending}
          onSaved={onSaved}
          footer={footer}
        />
      )}

      <ConfirmSheet
        open={confirmDiscard}
        title="¿Descartar el borrador?"
        message={<p>No se guardará nada de esta propuesta. Esta acción no se puede deshacer.</p>}
        confirmLabel="Descartar"
        danger
        loading={discard.isPending}
        onConfirm={() =>
          discard.mutate(undefined, {
            onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
          })
        }
        onClose={() => setConfirmDiscard(false)}
      />
    </Page>
  );
}

interface DraftProps<P> {
  draft: AiDraft<P>;
  readOnly: boolean;
  onSaved: (uuid: string) => void;
  footer: (submit: () => void, saving: boolean) => ReactNode;
}

// ------------------------------------------------------------------ Compra
function DocumentPreview({ documentUuid }: { documentUuid: string | null }) {
  const { can } = useSession();
  const { doc, error } = useDraftDocument(documentUuid, can('purchases.read'));
  if (!documentUuid) return null;
  return (
    <Card className={styles.docCard}>
      {error ? (
        <p className={styles.muted}>No se pudo mostrar el documento: {error}</p>
      ) : !doc ? (
        <div className={styles.docLoading}>Cargando documento…</div>
      ) : doc.isPdf ? (
        <div className={styles.stack}>
          <object
            data={doc.url}
            type="application/pdf"
            className={styles.docPdf}
            aria-label="Factura en PDF"
          >
            <p className={styles.muted}>Su navegador no muestra PDF aquí.</p>
          </object>
          <a href={doc.url} target="_blank" rel="noreferrer" className={styles.docLink}>
            <Icon name="eye" size={18} /> Abrir el PDF
          </a>
        </div>
      ) : (
        <a href={doc.url} target="_blank" rel="noreferrer" aria-label="Abrir la imagen completa">
          <img src={doc.url} alt="Factura original" className={styles.docImage} />
        </a>
      )}
    </Card>
  );
}

function PurchaseDraft({ draft, readOnly, onSaved, footer }: DraftProps<PurchaseDraftPayload>) {
  const { currency } = useTenant();
  const f = usePurchaseDraftForm(draft, onSaved);
  const p = draft.payload;
  // En móvil la factura empieza plegada para dejar a la vista los datos a revisar.
  const [docOpenByDefault] = useState(() => window.matchMedia('(width >= 1024px)').matches);
  const symbol = currencySymbol(currency);
  const ingredientOptions = [
    ...f.ingredients.map((i) => ({ value: i.uuid, label: `${i.name} (${unitLabel(i.unit)})` })),
    { value: NEW, label: '+ Crear ingrediente nuevo' },
    { value: SKIP, label: 'Omitir esta línea' },
  ];
  const supplierOptions = [
    ...f.suppliers.map((s) => ({ value: s.uuid, label: s.name })),
    ...(p.supplier.name || f.supplier === NEW
      ? [{ value: NEW, label: '+ Crear proveedor nuevo' }]
      : []),
  ];

  return (
    <div className={styles.draftLayout}>
      <div className={styles.docColumn}>
        <details className={styles.docDetails} open={docOpenByDefault}>
          <summary className={styles.docSummary}>
            <Icon name="file" size={18} /> Factura original
          </summary>
          <DocumentPreview documentUuid={draft.documentUuid ?? p.documentUuid} />
        </details>
      </div>
      <fieldset className={styles.formColumn} disabled={readOnly || f.saving}>
        <legend className="srOnly">Datos de la compra</legend>
        {p.warnings.length > 0 && (
          <Notice tone="warning" title="Revise antes de confirmar">
            <ul className={styles.warnList}>
              {p.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Notice>
        )}
        {f.formError && <Notice tone="danger" title={f.formError} />}
        <Card title="Datos de la factura">
          <FormGrid>
            <SelectField
              label="Proveedor"
              hint={p.supplier.name ? `En la factura: ${p.supplier.name}` : undefined}
              placeholder="Sin proveedor"
              options={supplierOptions}
              value={f.supplier}
              onChange={(e) => f.setSupplier(e.target.value)}
              error={f.errors.supplierUuid}
            />
            {f.supplier === NEW && (
              <TextField
                label="Nombre del proveedor nuevo"
                value={f.supplierName}
                onChange={(e) => f.setSupplierName(e.target.value)}
                error={f.errors.supplierName}
              />
            )}
            <TextField
              label="Fecha de compra"
              type="date"
              value={f.purchasedAt}
              onChange={(e) => f.setPurchasedAt(e.target.value)}
              error={f.errors.purchasedAt}
              required
            />
            <TextField
              label="N.º de factura"
              value={f.reference}
              onChange={(e) => f.setReference(e.target.value)}
              error={f.errors.reference}
              maxLength={60}
            />
          </FormGrid>
          {p.total && (
            <KeyValue
              label="Total según la factura"
              value={formatMoney(p.total, currency)}
              strong
            />
          )}
        </Card>

        <Card title={`Líneas de la factura (${f.lines.length})`}>
          {f.errors.items && <Notice tone="danger" title={f.errors.items} />}
          <ol className={styles.lines}>
            {f.lines.map((l) => {
              const errs = f.lineErrs[l.key] ?? {};
              const skipped = l.ingredient === SKIP;
              return (
                <li
                  key={l.key}
                  className={`${styles.line} ${!l.match ? styles.lineMissing : ''} ${skipped ? styles.lineSkipped : ''}`}
                >
                  <div className={styles.lineHead}>
                    <span className={styles.lineText}>{l.description}</span>
                    {skipped ? (
                      <StatusBadge tone="neutral">Omitida</StatusBadge>
                    ) : l.match && l.ingredient === l.match.ingredientUuid ? (
                      <StatusBadge tone="positive">Coincide: {l.match.name}</StatusBadge>
                    ) : !l.match ? (
                      <StatusBadge tone="warning">Sin coincidencia</StatusBadge>
                    ) : null}
                    {l.match && !l.unitCompatible && !skipped && (
                      <StatusBadge tone="warning">Revise la unidad</StatusBadge>
                    )}
                  </div>
                  <SelectField
                    label="Ingrediente"
                    placeholder="Elija un ingrediente…"
                    options={ingredientOptions}
                    value={l.ingredient}
                    onChange={(e) => f.setLine(l.key, { ingredient: e.target.value })}
                    error={errs.ingredientUuid}
                  />
                  {l.ingredient === NEW && (
                    <TextField
                      label="Nombre del ingrediente nuevo"
                      hint="Se creará con la unidad de esta línea y el costo de esta compra."
                      value={l.newName}
                      onChange={(e) => f.setLine(l.key, { newName: e.target.value })}
                      error={errs.newName}
                    />
                  )}
                  {!skipped && (
                    <div className={styles.lineGrid}>
                      <NumberField
                        label="Cantidad"
                        value={l.quantity}
                        onChange={(e) => f.setLine(l.key, { quantity: e.target.value })}
                        error={errs.quantity}
                      />
                      <SelectField
                        label="Unidad"
                        hint={l.rawUnit ? `Factura: ${l.rawUnit}` : undefined}
                        options={unitOptions}
                        value={l.unit}
                        onChange={(e) => f.setLine(l.key, { unit: e.target.value })}
                        error={errs.unit}
                      />
                      <NumberField
                        label="Total de la línea"
                        kind="money"
                        currencySymbol={symbol}
                        value={l.lineTotal}
                        onChange={(e) => f.setLine(l.key, { lineTotal: e.target.value })}
                        error={errs.lineTotal}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
        {footer(f.submit, f.saving)}
      </fieldset>
    </div>
  );
}

// ------------------------------------------------------------------ Receta
function RecipeDraft({ draft, readOnly, onSaved, footer }: DraftProps<RecipeDraftPayload>) {
  const { currency } = useTenant();
  const f = useRecipeDraftForm(draft, onSaved);
  const p = draft.payload;
  const symbol = currencySymbol(currency);
  const options = [
    ...f.ingredients.map((i) => ({
      value: i.uuid,
      label: `${i.name} (${unitLabel(i.unit)})${i.unitCost === null ? ' · sin costo' : ''}`,
    })),
    { value: SKIP, label: 'Omitir este ingrediente' },
  ];

  return (
    <fieldset className={styles.formColumn} disabled={readOnly || f.saving}>
      <legend className="srOnly">Datos de la receta</legend>
      {f.formError && <Notice tone="danger" title={f.formError} />}
      {p.missing.length > 0 && (
        <Notice tone="warning" title="Ingredientes que no están registrados">
          {p.missing.join(', ')}. Elija uno existente u omítalo; puede registrarlo después en{' '}
          <Link to="/app/ingredients/new">Ingredientes</Link>.
        </Notice>
      )}
      {p.missingCost.length > 0 && (
        <Notice tone="info" title="Ingredientes sin costo">
          {p.missingCost.join(', ')}: la receta quedará incompleta hasta que registre su costo.
        </Notice>
      )}
      <Card title="Receta">
        <FormGrid>
          <TextField
            label="Nombre"
            value={f.name}
            onChange={(e) => f.setName(e.target.value)}
            error={f.errors.name}
            required
          />
          <NumberField
            label="Porciones que rinde"
            value={f.portions}
            onChange={(e) => f.setPortions(e.target.value)}
            error={f.errors.portions}
          />
          <NumberField
            label="Empaque (monto fijo)"
            kind="money"
            currencySymbol={symbol}
            value={f.packaging}
            onChange={(e) => f.setPackaging(e.target.value)}
            error={f.errors['packaging.value']}
          />
          <NumberField
            label="Precio de venta (opcional)"
            kind="money"
            currencySymbol={symbol}
            value={f.currentPrice}
            onChange={(e) => f.setCurrentPrice(e.target.value)}
            error={f.errors.currentPrice}
          />
        </FormGrid>
      </Card>
      <Card title={`Ingredientes (${f.lines.length})`}>
        <ol className={styles.lines}>
          {f.lines.map((l) => {
            const errs = f.lineErrs[l.key] ?? {};
            const skipped = l.ingredient === SKIP;
            return (
              <li
                key={l.key}
                className={`${styles.line} ${!l.matchName ? styles.lineMissing : ''} ${skipped ? styles.lineSkipped : ''}`}
              >
                <div className={styles.lineHead}>
                  <span className={styles.lineText}>{l.original}</span>
                  {skipped ? (
                    <StatusBadge tone="neutral">Omitido</StatusBadge>
                  ) : l.matchName ? (
                    <StatusBadge tone="positive">Coincide: {l.matchName}</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">No registrado</StatusBadge>
                  )}
                  {l.missingCost && !skipped && <StatusBadge tone="warning">Sin costo</StatusBadge>}
                  {l.matchName && !l.unitCompatible && !skipped && (
                    <StatusBadge tone="warning">Revise la unidad</StatusBadge>
                  )}
                </div>
                <SelectField
                  label="Ingrediente"
                  placeholder="Elija un ingrediente…"
                  options={options}
                  value={l.ingredient}
                  onChange={(e) => f.setLine(l.key, { ingredient: e.target.value })}
                  error={errs.ingredientUuid}
                />
                {!skipped && (
                  <div className={styles.lineGrid2}>
                    <NumberField
                      label="Cantidad"
                      value={l.quantity}
                      onChange={(e) => f.setLine(l.key, { quantity: e.target.value })}
                      error={errs.quantity}
                    />
                    <SelectField
                      label="Unidad"
                      options={unitOptions}
                      value={l.unit}
                      onChange={(e) => f.setLine(l.key, { unit: e.target.value })}
                      error={errs.unit}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <p className={styles.footnote}>
          Al confirmar, AImargen calcula el costo con los precios vigentes de sus ingredientes.
        </p>
      </Card>
      {footer(f.submit, f.saving)}
    </fieldset>
  );
}

// ------------------------------------------------------------------ Escenario
function ScenarioDraft({ draft, readOnly, onSaved, footer }: DraftProps<ScenarioDraftPayload>) {
  const { currency } = useTenant();
  const f = useScenarioDraftForm(draft, onSaved);
  const p = draft.payload;
  const r = f.result;
  const money = (v: string | null | undefined) => (v ? formatMoney(v, currency) : '—');
  const profitNegative = !!r?.profit && r.profit.startsWith('-');

  return (
    <fieldset className={styles.formColumn} disabled={readOnly || f.saving}>
      <legend className="srOnly">Datos del escenario</legend>
      {f.formError && <Notice tone="danger" title={f.formError} />}
      <Card title="Supuestos">
        <FormGrid>
          <TextField
            label="Nombre del escenario"
            value={f.name}
            onChange={(e) => f.setName(e.target.value)}
            error={f.errors.name}
            required
          />
          <NumberField
            label="Precio de venta"
            kind="money"
            currencySymbol={currencySymbol(currency)}
            value={f.price}
            onChange={(e) => f.setPrice(e.target.value)}
            error={f.errors.price}
          />
          <NumberField
            label="Unidades por día"
            value={f.unitsPerDay}
            onChange={(e) => f.setUnitsPerDay(e.target.value)}
            error={f.errors.unitsPerDay}
          />
          <NumberField
            label="Días de venta al mes"
            value={f.daysPerMonth}
            onChange={(e) => f.setDaysPerMonth(e.target.value)}
            error={f.errors.daysPerMonth}
          />
        </FormGrid>
        <div>
          <KeyValue
            label="Costo variable por unidad"
            hint={
              p.variableSource === 'product' ? 'Según la receta del producto' : 'Monto indicado'
            }
            value={money(r?.inputs?.variableUnitCost ?? p.variableUnitCost)}
          />
          <KeyValue
            label="Costos fijos del mes"
            hint={p.fixedCosts === null ? 'Los registrados en su negocio' : 'Monto del escenario'}
            value={money(r?.fixedCosts ?? p.fixedCosts)}
          />
        </div>
      </Card>
      <Card
        title="Resultado estimado"
        action={f.recalculating ? <StatusBadge tone="info">Recalculando…</StatusBadge> : undefined}
      >
        {f.previewError && <Notice tone="danger" title={f.previewError} />}
        {r ? (
          <>
            <StatGrid>
              <Stat label="Ventas al mes" value={money(r.revenue)} />
              <Stat
                label="Utilidad al mes"
                value={money(r.profit)}
                tone={profitNegative ? 'danger' : 'positive'}
                caption={profitNegative ? 'Pérdida' : 'Ganancia'}
              />
              <Stat label="Margen" value={r.margin ? formatPercent(r.margin) : '—'} />
              <Stat
                label="Equilibrio"
                value={
                  r.breakEvenUnitsPerDay !== null
                    ? `${formatDecimal(String(r.breakEvenUnitsPerDay), 0)} al día`
                    : '—'
                }
                caption="Unidades para cubrir costos"
              />
            </StatGrid>
            {r.warnings.length > 0 && (
              <ul className={styles.warnList}>
                {r.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className={styles.muted}>Complete los supuestos para ver el resultado.</p>
        )}
        <p className={styles.footnote}>Calculado por el motor de AImargen, no por la IA.</p>
      </Card>
      {footer(f.submit, f.saving)}
    </fieldset>
  );
}
