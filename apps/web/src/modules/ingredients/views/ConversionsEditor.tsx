import { Button, IconButton, NumberField, SelectField } from '../../../core/ui';
import type { FieldErrors } from '../../../core/js/form';
import { newConversion, type ConversionRow } from '../js/use-ingredients';
import { UNIT_OPTIONS, isUnitCode, type UnitCode } from '../js/units';
import styles from '../css/ingredients.module.css';

/** Editor de equivalencias propias del ingrediente: "1 unidad = 60 g". */
export function ConversionsEditor({
  unit,
  rows,
  errors,
  onChange,
}: {
  unit: UnitCode;
  rows: ConversionRow[];
  errors: FieldErrors;
  onChange: (rows: ConversionRow[]) => void;
}) {
  const update = (key: number, patch: Partial<ConversionRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div className={styles.conversions}>
      {rows.map((r, idx) => (
        <fieldset key={r.key} className={styles.conversion}>
          <legend className="srOnly">Equivalencia {idx + 1}</legend>
          <span className={styles.conversionOne} aria-hidden="true">
            1
          </span>
          <SelectField
            label="Unidad"
            value={r.from}
            onChange={(e) => isUnitCode(e.target.value) && update(r.key, { from: e.target.value })}
            error={errors[`conversions.${idx}.from`]}
            options={UNIT_OPTIONS}
          />
          <span className={styles.conversionEq} aria-hidden="true">
            =
          </span>
          <NumberField
            label="Equivale a"
            value={r.factor}
            onChange={(e) => update(r.key, { factor: e.target.value })}
            error={errors[`conversions.${idx}.factor`]}
            placeholder="60"
          />
          <SelectField
            label="En"
            value={r.to}
            onChange={(e) => isUnitCode(e.target.value) && update(r.key, { to: e.target.value })}
            error={errors[`conversions.${idx}.to`]}
            options={UNIT_OPTIONS}
          />
          <IconButton
            icon="trash"
            label={`Quitar equivalencia ${idx + 1}`}
            className={styles.conversionRemove}
            onClick={() => onChange(rows.filter((x) => x.key !== r.key))}
          />
        </fieldset>
      ))}
      {rows.length < 10 && (
        <div>
          <Button
            variant="secondary"
            icon="plus"
            onClick={() => onChange([...rows, newConversion(unit)])}
          >
            Agregar equivalencia
          </Button>
        </div>
      )}
    </div>
  );
}
