import { describe, expect, it } from 'vitest';
import {
  CalculationError,
  Decimal,
  assertNonNegative,
  round,
  safeDivide,
  toDecimal,
} from './decimal.js';

describe('decimal: fundamentos del motor', () => {
  it('evita errores de punto flotante (0.1 + 0.2 = 0.3)', () => {
    expect(toDecimal('0.1').plus(toDecimal('0.2')).equals(new Decimal('0.3'))).toBe(true);
  });

  it('redondea HALF_UP a 2 decimales por defecto', () => {
    expect(round(toDecimal('1666.665'))).toBe('1666.67');
    expect(round(toDecimal('1666.664'))).toBe('1666.66');
    expect(round(toDecimal('2000'))).toBe('2000.00');
  });

  it('acepta escala configurable', () => {
    expect(round(toDecimal('1.23456'), 4)).toBe('1.2346');
    expect(round(toDecimal('1500.5'), 0)).toBe('1501');
  });

  it('rechaza escalas inválidas', () => {
    expect(() => round(toDecimal('1'), 7)).toThrowError(CalculationError);
    expect(() => round(toDecimal('1'), -1)).toThrowError(CalculationError);
  });

  it('rechaza entradas no numéricas o no finitas', () => {
    expect(() => toDecimal('abc')).toThrowError(CalculationError);
    expect(() => toDecimal('1e5')).toThrowError(CalculationError);
    expect(() => toDecimal(Number.NaN)).toThrowError(CalculationError);
    expect(() => toDecimal(Number.POSITIVE_INFINITY)).toThrowError(CalculationError);
  });

  it('división entre cero produce error controlado', () => {
    try {
      safeDivide(toDecimal('10'), toDecimal('0'), 'porciones');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CalculationError);
      expect((e as CalculationError).code).toBe('DIVISION_BY_ZERO');
      expect((e as CalculationError).message).toContain('No se puede dividir entre cero');
    }
  });

  it('valores negativos son rechazados cuando no tienen sentido', () => {
    expect(() => assertNonNegative(toDecimal('-1'), 'precio')).toThrowError(/negativo/);
    expect(assertNonNegative(toDecimal('0'), 'precio').isZero()).toBe(true);
  });
});
