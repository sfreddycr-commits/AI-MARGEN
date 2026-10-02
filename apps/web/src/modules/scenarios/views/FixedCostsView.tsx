import { useState } from 'react';
import {
  Button,
  ConfirmSheet,
  EmptyState,
  List,
  ListRow,
  Notice,
  NumberField,
  Sheet,
  Skeleton,
  Stat,
  StatusBadge,
  TextAreaField,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { useTenant } from '../../../core/session/js/session-context';
import { errorMessage } from '../../../core/js/api-client';
import { currencySymbol, formatMoney } from '../../../core/js/format';
import {
  toFixedCostForm,
  useArchiveFixedCost,
  useFixedCosts,
  useSaveFixedCost,
  type FixedCostFormValues,
} from '../js/use-scenarios';
import type { FixedCost } from '../js/scenarios.service';
import styles from '../css/scenarios.module.css';

/** `undefined` = sheet cerrado; `null` = nuevo; objeto = edición. */
type Editing = FixedCost | null | undefined;

export default function FixedCostsView() {
  const { can, currency } = useTenant();
  const canWrite = can('scenarios.write');
  const list = useFixedCosts();
  const [editing, setEditing] = useState<Editing>(undefined);
  const [archiving, setArchiving] = useState<FixedCost | null>(null);
  const toast = useToast();
  const archive = useArchiveFixedCost();
  const doArchive = () => {
    if (!archiving) return;
    archive.mutate(archiving.uuid, {
      onSuccess: () => {
        setArchiving(null);
        toast.show('Costo fijo archivado');
      },
      onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
    });
  };

  return (
    <Page
      title="Costos fijos"
      description="Lo que paga cada mes aunque no venda nada: alquiler, salarios, luz, agua, internet, patentes. Se usan para calcular su punto de equilibrio."
      back="/app/scenarios"
      action={
        canWrite && (
          <Button icon="plus" onClick={() => setEditing(null)}>
            Agregar
          </Button>
        )
      }
    >
      {list.error && (
        <Notice tone="danger" title="No se pudieron cargar los costos fijos">
          {list.error.message}
        </Notice>
      )}

      {list.isPending ? (
        <>
          <Skeleton height={96} radius={14} />
          <List label="Cargando">
            {[0, 1, 2].map((i) => (
              <li key={i} className={styles.skeletonRow}>
                <Skeleton width="40%" />
                <Skeleton width="25%" height={12} />
              </li>
            ))}
          </List>
        </>
      ) : list.items.length === 0 ? (
        <EmptyState
          icon="building"
          title="Aún no tiene costos fijos"
          description="Agregue el alquiler, los salarios y los servicios para saber cuánto necesita vender al mes para no perder."
          action={
            canWrite && (
              <Button icon="plus" onClick={() => setEditing(null)}>
                Agregar costo fijo
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className={styles.totalRow}>
            <Stat
              label="Total al mes"
              value={list.total === null ? '—' : formatMoney(list.total, currency)}
              caption={`${list.items.length} ${list.items.length === 1 ? 'costo fijo' : 'costos fijos'}`}
            />
          </div>
          <List label="Costos fijos">
            {list.items.map((f) => (
              <ListRow
                key={f.uuid}
                icon="building"
                title={f.name}
                subtitle={f.notes ?? undefined}
                badge={f.isDemo ? <StatusBadge tone="info">Demo</StatusBadge> : undefined}
                value={formatMoney(f.monthlyAmount, currency)}
                valueCaption="al mes"
                onClick={canWrite ? () => setEditing(f) : undefined}
              />
            ))}
          </List>
        </>
      )}

      <FixedCostSheet
        key={editing === undefined ? 'closed' : (editing?.uuid ?? 'new')}
        editing={editing}
        currency={currency}
        onClose={() => setEditing(undefined)}
        onArchive={(f) => {
          setEditing(undefined);
          setArchiving(f);
        }}
      />
      <ConfirmSheet
        open={archiving !== null}
        title="¿Archivar este costo fijo?"
        message={
          <p>
            «{archiving?.name}» dejará de sumarse al total mensual y a los escenarios que usan los
            costos del negocio.
          </p>
        }
        confirmLabel="Archivar"
        danger
        loading={archive.isPending}
        onConfirm={doArchive}
        onClose={() => setArchiving(null)}
      />
    </Page>
  );
}

function FixedCostSheet({
  editing,
  currency,
  onClose,
  onArchive,
}: {
  editing: Editing;
  currency: string;
  onClose: () => void;
  onArchive: (f: FixedCost) => void;
}) {
  const toast = useToast();
  const existing = editing ?? null;
  const [values, setValues] = useState<FixedCostFormValues>(() => toFixedCostForm(existing));
  const save = useSaveFixedCost(existing, () => {
    toast.show(existing ? 'Costo fijo actualizado' : 'Costo fijo agregado');
    onClose();
  });
  const set = (k: keyof FixedCostFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const formId = 'fixed-cost-form';

  return (
    <Sheet
      open={editing !== undefined}
      onClose={onClose}
      title={existing ? 'Editar costo fijo' : 'Nuevo costo fijo'}
      footer={
        <div className={styles.sheetFooter}>
          {existing && (
            <Button variant="ghost" icon="archive" onClick={() => onArchive(existing)}>
              Archivar
            </Button>
          )}
          <Button type="submit" form={formId} loading={save.saving}>
            {existing ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        noValidate
        className={styles.sheetForm}
        onSubmit={(e) => {
          e.preventDefault();
          save.submit(values);
        }}
      >
        {save.formError && <Notice tone="danger" title={save.formError} />}
        <TextField
          label="Nombre"
          placeholder="Ej. Alquiler del local"
          value={values.name}
          onChange={set('name')}
          error={save.errors.name}
          required
        />
        <NumberField
          kind="money"
          currencySymbol={currencySymbol(currency).trim()}
          label="Monto mensual"
          value={values.monthlyAmount}
          onChange={set('monthlyAmount')}
          error={save.errors.monthlyAmount}
        />
        <TextAreaField
          label="Notas"
          hint="Opcional. Ej. se paga el día 5."
          value={values.notes}
          onChange={set('notes')}
          error={save.errors.notes}
        />
      </form>
    </Sheet>
  );
}
