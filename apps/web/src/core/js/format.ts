/** Formato de montos y porcentajes (implementación compartida con la API en @aimargen/types). */
export {
  formatDecimal,
  formatMoney,
  formatPercent,
  parseLocaleDecimal,
  currencySymbol,
} from '@aimargen/types';

const dateFmt = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('es-CR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** "2026-09-28" o ISO completo → "28 sept 2026". Las fechas sin hora no se desplazan por zona. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d);
}

/** Unidades en español para mostrar. */
export const UNIT_LABELS: Record<string, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'L',
  unidad: 'unid.',
};

export function unitLabel(code: string | null | undefined): string {
  return code ? (UNIT_LABELS[code] ?? code) : '';
}
