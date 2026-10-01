/**
 * Formato y lectura de números para Costa Rica (SOP: ₡, separador de miles "." y decimal ",").
 * Solo presentación: ninguna fórmula financiera vive aquí (eso es el motor de cálculo).
 * Los valores internos son strings decimales con punto ("1666.67").
 */

const CURRENCY_SYMBOLS: Record<string, string> = { CRC: '₡', USD: '$', EUR: '€' };

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

/** Agrupa miles con "." y usa "," como decimal. Entrada: string decimal con punto. */
export function formatDecimal(value: string, scale = 2): string {
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value;
  const negative = value.startsWith('-');
  const abs = negative ? value.slice(1) : value;
  const [int = '0', frac = ''] = abs.split('.');
  // Redondeo de presentación HALF_UP con aritmética de strings (sin floats)
  const padded = (frac + '0'.repeat(scale + 1)).slice(0, scale + 1);
  let digits = (int + padded.slice(0, scale)).replace(/^0+(?=\d)/, '');
  if (Number(padded[scale] ?? '0') >= 5) digits = incrementDigits(digits);
  const intPart = scale > 0 ? digits.slice(0, -scale) || '0' : digits;
  const fracPart = scale > 0 ? digits.slice(-scale).padStart(scale, '0') : '';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const isZero = /^[0.]*$/.test(intPart + fracPart);
  return `${negative && !isZero ? '-' : ''}${grouped}${fracPart ? `,${fracPart}` : ''}`;
}

function incrementDigits(d: string): string {
  const arr = d.split('');
  let i = arr.length - 1;
  while (i >= 0) {
    if (arr[i] === '9') {
      arr[i] = '0';
      i--;
    } else {
      arr[i] = String(Number(arr[i]) + 1);
      return arr.join('');
    }
  }
  return `1${arr.join('')}`;
}

/** ₡1.666,67 — los montos se muestran con la escala del tenant (default 2). */
export function formatMoney(value: string, currency = 'CRC', scale = 2): string {
  const formatted = formatDecimal(value, scale);
  return formatted.startsWith('-')
    ? `-${currencySymbol(currency)}${formatted.slice(1)}`
    : `${currencySymbol(currency)}${formatted}`;
}

/** "0.4" → "40%"; "0.4567" → "45,7%". */
export function formatPercent(fraction: string, scale = 1): string {
  if (!/^-?\d+(\.\d+)?$/.test(fraction)) return fraction;
  const negative = fraction.startsWith('-');
  const abs = negative ? fraction.slice(1) : fraction;
  const [int = '0', frac = ''] = abs.split('.');
  const shifted = `${int}${(frac + '00').slice(0, 2)}.${frac.slice(2) || '0'}`.replace(
    /^0+(?=\d)/,
    '',
  );
  const out = formatDecimal(shifted, scale).replace(/,0+$/, '');
  return `${negative && out !== '0' ? '-' : ''}${out}%`;
}

/**
 * Lee lo que la persona escribe y devuelve un string decimal con punto, o null si no es válido.
 * Acepta "1.500" (mil quinientos), "1.500,75", "1500,75", "1500.75", "2,5", "₡ 10.000".
 * Un único punto seguido de 1–2 o 4+ dígitos se interpreta como decimal ("2.5" → 2.5).
 */
export function parseLocaleDecimal(input: string): string | null {
  let s = input.trim().replace(/[₡$€\s]/g, '');
  if (!s) return null;
  const negative = s.startsWith('-');
  if (negative) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s)) return null;

  const commas = (s.match(/,/g) ?? []).length;
  const dots = (s.match(/\./g) ?? []).length;
  let normalized: string;

  if (commas > 1) return null;
  if (commas === 1) {
    // La coma es el decimal; los puntos deben ser separadores de miles válidos
    const [intPart = '', fracPart = ''] = s.split(',');
    if (dots > 0 && !/^\d{1,3}(\.\d{3})+$/.test(intPart)) return null;
    normalized = `${intPart.replace(/\./g, '')}.${fracPart}`;
  } else if (dots === 0) {
    normalized = s;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, ''); // 1.500 / 10.000 / 1.250.000
  } else if (dots === 1) {
    normalized = s; // 2.5 / 1666.67
  } else {
    return null;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized) && !/^\d+\.$/.test(normalized)) return null;
  normalized = normalized.replace(/\.$/, '').replace(/^0+(?=\d)/, '');
  return negative ? `-${normalized}` : normalized;
}
