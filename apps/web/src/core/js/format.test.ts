import { describe, expect, it } from 'vitest';
import { formatDecimal, formatMoney, formatPercent, parseLocaleDecimal } from './format';

describe('formatMoney (presentación CR)', () => {
  it.each([
    ['1666.666667', '₡1.666,67'],
    ['10000', '₡10.000,00'],
    ['2000', '₡2.000,00'],
    ['0.005', '₡0,01'],
    ['999.995', '₡1.000,00'],
    ['1250000.5', '₡1.250.000,50'],
    ['-800', '-₡800,00'],
    ['0', '₡0,00'],
  ])('%s → %s', (input, expected) => {
    expect(formatMoney(input)).toBe(expected);
  });

  it('respeta la escala del tenant', () => {
    expect(formatMoney('1500.5', 'CRC', 0)).toBe('₡1.501');
    expect(formatDecimal('1.23456', 4)).toBe('1,2346');
  });

  it('usa el símbolo de otras monedas', () => {
    expect(formatMoney('12.5', 'USD')).toBe('$12,50');
  });
});

describe('formatPercent', () => {
  it.each([
    ['0.4', '40%'],
    ['0.45', '45%'],
    ['0.4567', '45,7%'],
    ['0.375', '37,5%'],
    ['1', '100%'],
    ['-0.12', '-12%'],
    ['0', '0%'],
  ])('%s → %s', (input, expected) => {
    expect(formatPercent(input)).toBe(expected);
  });
});

describe('parseLocaleDecimal (lo que escribe la persona)', () => {
  it.each([
    ['10.000', '10000'],
    ['1.500', '1500'],
    ['1.250.000', '1250000'],
    ['1.500,75', '1500.75'],
    ['1500,75', '1500.75'],
    ['1500.75', '1500.75'],
    ['2,5', '2.5'],
    ['2.5', '2.5'],
    ['₡ 5.500', '5500'],
    ['0,40', '0.40'],
    ['007', '7'],
    ['15,', '15'],
  ])('"%s" → %s', (input, expected) => {
    expect(parseLocaleDecimal(input)).toBe(expected);
  });

  it.each(['', 'abc', '1,2,3', '1.50.0,2', '12a', '1.5.6'])('"%s" no es válido', (input) => {
    expect(parseLocaleDecimal(input)).toBeNull();
  });
});
