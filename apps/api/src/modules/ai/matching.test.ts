import { describe, expect, it } from 'vitest';
import { bestMatch, normalizeUnit, similarity } from './matching.js';

describe('emparejamiento de nombres', () => {
  const ingredients = [
    { uuid: '1', name: 'Queso mozzarella' },
    { uuid: '2', name: 'Carne molida' },
    { uuid: '3', name: 'Pan de hamburguesa' },
    { uuid: '4', name: 'Leche entera' },
  ];

  it('encuentra el ingrediente aunque cambien mayúsculas, tildes o palabras extra', () => {
    expect(bestMatch('QUESO MOZZARELLA DOS PINOS 1KG', ingredients)?.uuid).toBe('1');
    expect(bestMatch('carne', ingredients)?.uuid).toBe('2');
    expect(bestMatch('pan hamburguesa', ingredients)?.uuid).toBe('3');
  });

  it('no inventa coincidencias cuando no hay parecido', () => {
    expect(bestMatch('Servilletas', ingredients)).toBeNull();
  });

  it('similitud simétrica y acotada', () => {
    expect(similarity('Leche', 'Leche')).toBe(1);
    expect(similarity('abc', 'xyz')).toBeLessThan(0.3);
  });

  it('normaliza unidades comunes', () => {
    expect(normalizeUnit('Kilos')).toBe('kg');
    expect(normalizeUnit('gr')).toBe('g');
    expect(normalizeUnit('Lts')).toBe('l');
    expect(normalizeUnit('und')).toBe('unidad');
    expect(normalizeUnit('caja')).toBeNull();
  });
});
