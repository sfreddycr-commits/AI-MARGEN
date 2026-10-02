import { useMemo, useState } from 'react';
import {
  Actions,
  Button,
  FormGrid,
  Icon,
  SearchField,
  SelectField,
  Sheet,
  Skeleton,
  TextField,
} from '../../../core/ui';
import { unitLabel } from '../../../core/js/format';
import {
  useIngredientChoices,
  useQuickIngredient,
  type PickedIngredient,
} from '../js/use-purchases';
import { UNIT_OPTIONS, isUnitCode, type UnitCode } from '../../ingredients/js/units';
import styles from '../css/purchases.module.css';

/**
 * Selector de ingrediente con búsqueda (lee el cache local) y alta rápida
 * de un ingrediente nuevo con solo nombre y unidad.
 */
export function IngredientPickerSheet({
  open,
  onClose,
  onPick,
  canCreate,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (i: PickedIngredient) => void;
  canCreate: boolean;
}) {
  const choices = useIngredientChoices();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<UnitCode>('kg');
  const quick = useQuickIngredient((i) => {
    onPick({ uuid: i.uuid, name: i.name, unit: i.unit, conversions: i.conversions });
    setQ('');
    setCreating(false);
    setName('');
  });

  const items = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('es');
    return choices.items.filter((i) => !term || i.name.toLocaleLowerCase('es').includes(term));
  }, [choices.items, q]);

  const reset = () => {
    setQ('');
    setCreating(false);
    setName('');
    quick.reset();
  };
  const pick = (i: PickedIngredient) => {
    onPick(i);
    reset();
  };
  const close = () => {
    reset();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={creating ? 'Nuevo ingrediente' : 'Elegir ingrediente'}
      footer={
        creating ? (
          <Actions>
            <Button variant="secondary" onClick={() => setCreating(false)} disabled={quick.saving}>
              Volver
            </Button>
            <Button type="submit" form="quick-ingredient-form" loading={quick.saving}>
              Crear y usar
            </Button>
          </Actions>
        ) : undefined
      }
    >
      {creating ? (
        <form
          id="quick-ingredient-form"
          noValidate
          className={styles.sheetForm}
          onSubmit={(e) => {
            e.preventDefault();
            quick.create(name, unit);
          }}
        >
          <p className={styles.help}>
            Se crea con lo básico. Luego puede completar su categoría, rendimiento y equivalencias.
          </p>
          <FormGrid columns={1}>
            <TextField
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={quick.errors.name}
              autoFocus
            />
            <SelectField
              label="Unidad base"
              hint="La unidad en que se calcula el costo."
              value={unit}
              onChange={(e) => isUnitCode(e.target.value) && setUnit(e.target.value)}
              error={quick.errors.unit}
              options={UNIT_OPTIONS}
            />
          </FormGrid>
        </form>
      ) : (
        <div className={styles.picker}>
          <SearchField value={q} onChange={setQ} placeholder="Buscar ingrediente" />
          {canCreate && (
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => {
                setName(q.trim());
                setCreating(true);
              }}
            >
              {q.trim() ? `Crear “${q.trim()}”` : 'Crear ingrediente nuevo'}
            </Button>
          )}
          {choices.isPending ? (
            <div className={styles.pickerList}>
              <Skeleton height={44} />
              <Skeleton height={44} />
            </div>
          ) : items.length === 0 ? (
            <p className={styles.help}>
              {choices.items.length === 0
                ? 'Aún no tiene ingredientes. Cree el primero aquí mismo.'
                : 'No hay ingredientes con ese nombre.'}
            </p>
          ) : (
            <ul className={styles.pickerList} aria-label="Ingredientes">
              {items.map((i) => (
                <li key={i.uuid}>
                  <button
                    type="button"
                    className={styles.pickerItem}
                    onClick={() =>
                      pick({ uuid: i.uuid, name: i.name, unit: i.unit, conversions: i.conversions })
                    }
                  >
                    <span className={styles.pickerName}>{i.name}</span>
                    <span className={styles.pickerUnit}>{unitLabel(i.unit)}</span>
                    <Icon name="chevronRight" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Sheet>
  );
}
