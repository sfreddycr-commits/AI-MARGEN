import { describe, expect, it } from 'vitest';
import { decimalString, email, fractionString } from './common.js';

describe('schemas: primitivas', () => {
  it('decimalString acepta montos válidos y rechaza negativos', () => {
    expect(decimalString.safeParse('10000').success).toBe(true);
    expect(decimalString.safeParse('2000.50').success).toBe(true);
    const neg = decimalString.safeParse('-1');
    expect(neg.success).toBe(false);
    expect(neg.error?.issues[0]?.message).toBe('Ingrese un número válido mayor o igual a cero.');
  });

  it('fractionString rechaza margen de 100% o más', () => {
    expect(fractionString.safeParse('0.40').success).toBe(true);
    expect(fractionString.safeParse('1').success).toBe(false);
  });

  it('email normaliza a minúsculas', () => {
    expect(email.parse('  Ana@Ejemplo.COM ')).toBe('ana@ejemplo.com');
    expect(email.safeParse('no-es-correo').success).toBe(false);
  });
});
