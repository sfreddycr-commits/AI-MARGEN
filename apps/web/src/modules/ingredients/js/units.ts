import { UNIT_CODES } from '@aimargen/schemas';
import { compatibleUnits, type CustomConversion } from '@aimargen/calculation-engine';
import { formatMoney, unitLabel } from '../../../core/js/format';

/**
 * Unidades para mostrar y elegir (SOP §12). La conversión real la hace el motor en la API;
 * aquí solo se decide qué unidades ofrecer en los selectores.
 */
export type UnitCode = (typeof UNIT_CODES)[number];

export const UNIT_NAMES: Record<UnitCode, string> = {
  g: 'Gramos (g)',
  kg: 'Kilogramos (kg)',
  ml: 'Mililitros (ml)',
  l: 'Litros (L)',
  unidad: 'Unidades',
};

/** "Costo por kilo", "Costo por unidad". */
export const UNIT_SINGULAR: Record<UnitCode, string> = {
  g: 'gramo',
  kg: 'kilo',
  ml: 'mililitro',
  l: 'litro',
  unidad: 'unidad',
};

export const UNIT_OPTIONS = UNIT_CODES.map((u) => ({ value: u, label: UNIT_NAMES[u] }));

export function isUnitCode(v: string): v is UnitCode {
  return (UNIT_CODES as readonly string[]).includes(v);
}

/** Unidades en las que se puede comprar/registrar un ingrediente con su unidad base y conversiones. */
export function unitOptionsFor(unit: string, conversions: readonly CustomConversion[] = []) {
  if (!isUnitCode(unit)) return UNIT_OPTIONS;
  return compatibleUnits(unit, conversions).map((u) => ({ value: u, label: UNIT_NAMES[u] }));
}

/** "₡2.400,00/kg". Montos pequeños (por gramo) muestran más decimales para no verse en cero. */
export function moneyPerUnit(value: string | null, unit: string, currency: string): string {
  if (value === null) return 'Sin costo';
  const small = /^0\.0/.test(value) || value === '0';
  return `${formatMoney(value, currency, small && value !== '0' ? 4 : 2)}/${unitLabel(unit)}`;
}
