import { describe, expect, it } from 'vitest';
import {
  CalculationError,
  analyzePricing,
  breakEven,
  calculateRecipe,
  canConvert,
  convertQuantity,
  marginForMultiplier,
  multiplierForMargin,
  percentChange,
  priceByMargin,
  priceByMultiplier,
  profit,
  purchaseUnitCost,
  realMargin,
  round,
  simulateScenario,
  toDecimal,
  unitCost,
  usedCost,
  weightedAverageUnitCost,
} from './index.js';

const r2 = (v: string | null) => (v === null ? null : round(toDecimal(v), 2));

describe('Pruebas mínimas del SOP §37', () => {
  it('1. 5 kg por ₡10.000 → ₡2.000/kg', () => {
    expect(round(unitCost('10000', '5'))).toBe('2000.00');
    expect(
      r2(
        purchaseUnitCost({
          price: '10000',
          quantity: '5',
          purchaseUnit: 'kg',
          ingredientUnit: 'kg',
        }),
      ),
    ).toBe('2000.00');
  });

  it('2. 250 g → ₡500 con costo ₡2.000/kg', () => {
    const qtyKg = convertQuantity('250', 'g', 'kg');
    expect(round(usedCost(qtyKg, '2000'))).toBe('500.00');
    const recipe = calculateRecipe({
      portions: '1',
      items: [
        { ref: 'harina', quantity: '250', unit: 'g', ingredientUnit: 'kg', unitCost: '2000' },
      ],
    });
    expect(r2(recipe.items[0]!.cost)).toBe('500.00');
  });

  it('3. ₡10.000 / 10 porciones → ₡1.000', () => {
    const recipe = calculateRecipe({
      portions: '10',
      items: [
        { ref: 'x', quantity: '1', unit: 'unidad', ingredientUnit: 'unidad', unitCost: '10000' },
      ],
    });
    expect(r2(recipe.costPerPortion)).toBe('1000.00');
  });

  it('4. costo ₡1.000, margen 40% → ₡1.666,67', () => {
    expect(r2(priceByMargin('1000', '0.40'))).toBe('1666.67');
  });

  it('5. precio ₡2.000, costo ₡1.200 → utilidad ₡800 y margen 40%', () => {
    expect(r2(profit('2000', '1200'))).toBe('800.00');
    expect(r2(realMargin('2000', '1200'))).toBe('0.40');
  });

  it('6. precio menor al costo → warning', () => {
    const a = analyzePricing({ cost: '1200', currentPrice: '1000', targetMargin: '0.4' });
    expect(a.warnings.map((w) => w.code)).toContain('PRICE_BELOW_COST');
    expect(r2(a.current!.margin)).toBe('-0.20');
  });

  it('7. división entre cero → error controlado', () => {
    expect(() => unitCost('100', '0')).toThrowError(CalculationError);
    expect(() => realMargin('0', '10')).toThrowError(/dividir entre cero/);
    const recipe = calculateRecipe({ portions: '0', items: [] });
    expect(recipe.costPerPortion).toBeNull();
    expect(recipe.warnings.map((w) => w.code)).toContain('NO_PORTIONS');
  });

  it('8. margen inválido → error', () => {
    for (const m of ['1', '1.2', '-0.1']) {
      try {
        priceByMargin('1000', m);
        expect.unreachable();
      } catch (e) {
        expect((e as CalculationError).code).toBe('INVALID_MARGIN');
      }
    }
  });
});

describe('conversiones', () => {
  it('kg↔g y l↔ml', () => {
    expect(convertQuantity('1', 'kg', 'g').toString()).toBe('1000');
    expect(convertQuantity('500', 'ml', 'l').toString()).toBe('0.5');
  });

  it('no convierte unidades incompatibles sin factor definido', () => {
    expect(() => convertQuantity('1', 'unidad', 'g')).toThrowError(/compatibles/);
    expect(canConvert('kg', 'ml')).toBe(false);
  });

  it('usa conversiones propias en ambos sentidos (1 huevo = 50 g)', () => {
    const conv = [{ from: 'unidad' as const, to: 'g' as const, factor: '50' }];
    expect(convertQuantity('2', 'unidad', 'g', conv).toString()).toBe('100');
    expect(convertQuantity('0.3', 'kg', 'unidad', conv).toString()).toBe('6');
  });

  it('compra en una unidad y costeo en otra: 2 kg por ₡3.000 → ₡1,5/g', () => {
    expect(
      purchaseUnitCost({ price: '3000', quantity: '2', purchaseUnit: 'kg', ingredientUnit: 'g' }),
    ).toBe('1.500000');
  });
});

describe('receta completa', () => {
  const base = {
    portions: '4',
    items: [
      // 500 g de carne a ₡6.000/kg con rendimiento 80% → 500 × 6 / 0.8 = 3.750
      {
        ref: 'carne',
        quantity: '500',
        unit: 'g',
        ingredientUnit: 'kg',
        unitCost: '6000',
        yield: '0.8',
      },
      // 4 panes a ₡250 c/u → 1.000
      { ref: 'pan', quantity: '4', unit: 'unidad', ingredientUnit: 'unidad', unitCost: '250' },
    ],
  };

  it('suma ingredientes, empaque, mano de obra, indirectos y merma sin doble conteo', () => {
    const r = calculateRecipe({
      ...base,
      packaging: { mode: 'fixed', value: '720' },
      labor: { mode: 'percent', value: '0.10' },
      overhead: { mode: 'fixed', value: '300' },
      wastePct: '0.02',
    });
    expect(r2(r.ingredientsCost)).toBe('4750.00');
    expect(r2(r.packagingCost)).toBe('720.00');
    expect(r2(r.laborCost)).toBe('475.00');
    expect(r2(r.overheadCost)).toBe('300.00');
    expect(r2(r.wasteCost)).toBe('95.00');
    expect(r2(r.totalCost)).toBe('6340.00');
    expect(r2(r.costPerPortion)).toBe('1585.00');
    expect(r.complete).toBe(true);
  });

  it('marca la receta incompleta si falta un costo, sin inventarlo', () => {
    const r = calculateRecipe({
      ...base,
      items: [
        ...base.items,
        {
          ref: 'queso',
          name: 'Queso',
          quantity: '30',
          unit: 'g',
          ingredientUnit: 'kg',
          unitCost: null,
        },
      ],
    });
    expect(r.complete).toBe(false);
    expect(r.items[2]!.cost).toBeNull();
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ code: 'MISSING_COST', ref: 'queso' }),
    );
    expect(r2(r.ingredientsCost)).toBe('4750.00');
  });

  it('marca unidades incompatibles como advertencia, no como error fatal', () => {
    const r = calculateRecipe({
      portions: '1',
      items: [{ ref: 'huevo', quantity: '2', unit: 'unidad', ingredientUnit: 'g', unitCost: '3' }],
    });
    expect(r.complete).toBe(false);
    expect(r.warnings[0]!.code).toBe('INCOMPATIBLE_UNITS');
  });

  it('rechaza rendimiento fuera de (0, 1] y merma ≥ 100%', () => {
    expect(() =>
      calculateRecipe({ portions: '1', items: [{ ...base.items[0]!, yield: '0' }] }),
    ).toThrowError(CalculationError);
    expect(() => calculateRecipe({ ...base, wastePct: '1' })).toThrowError(CalculationError);
  });

  it('rechaza cantidades negativas', () => {
    expect(() =>
      calculateRecipe({ portions: '1', items: [{ ...base.items[1]!, quantity: '-1' }] }),
    ).toThrowError(/negativo/);
  });
});

describe('precio y rentabilidad', () => {
  it('margen ≠ multiplicador: 40% de margen equivale a ×1,6667; ×2 equivale a 50%', () => {
    expect(r2(multiplierForMargin('0.4'))).toBe('1.67');
    expect(r2(marginForMultiplier('2'))).toBe('0.50');
    expect(r2(priceByMultiplier('1000', '2'))).toBe('2000.00');
  });

  it('análisis completo con diferencia al recomendado', () => {
    const a = analyzePricing({
      cost: '1000',
      currentPrice: '1500',
      targetMargin: '0.4',
      multiplier: '2.5',
    });
    expect(r2(a.current!.margin)).toBe('0.33');
    expect(r2(a.byMargin!.price)).toBe('1666.67');
    expect(r2(a.byMultiplier!.price)).toBe('2500.00');
    expect(r2(a.differenceToRecommended)).toBe('166.67');
    expect(a.warnings.map((w) => w.code)).toContain('MARGIN_BELOW_TARGET');
  });

  it('producto sin precio → warning NO_PRICE', () => {
    expect(analyzePricing({ cost: '500' }).warnings.map((w) => w.code)).toEqual(['NO_PRICE']);
  });
});

describe('escenarios y equilibrio', () => {
  it('punto de equilibrio en unidades y dinero', () => {
    const be = breakEven({ fixedCosts: '600000', price: '2500', variableUnitCost: '1000' });
    expect(r2(be.units)).toBe('400.00');
    expect(be.unitsRounded).toBe('400');
    expect(r2(be.revenue)).toBe('1000000.00');
  });

  it('sin margen de contribución → error controlado', () => {
    expect(() =>
      breakEven({ fixedCosts: '1', price: '100', variableUnitCost: '100' }),
    ).toThrowError(CalculationError);
  });

  it('simulación mensual: 40 unidades/día a ₡5.500', () => {
    const s = simulateScenario({
      price: '5500',
      unitsPerDay: '40',
      daysPerMonth: '26',
      fixedCosts: '1500000',
      variableUnitCost: '2200',
    });
    expect(r2(s.unitsPerMonth)).toBe('1040.00');
    expect(r2(s.revenue)).toBe('5720000.00');
    expect(r2(s.totalCosts)).toBe('3788000.00');
    expect(r2(s.profit)).toBe('1932000.00');
    expect(s.breakEven!.unitsRounded).toBe('455');
    expect(s.breakEvenUnitsPerDay).toBe('18');
    expect(s.warnings).toEqual([]);
  });

  it('escenario con pérdida y sin equilibrio genera advertencias', () => {
    const s = simulateScenario({
      price: '1000',
      unitsPerDay: '10',
      daysPerMonth: '30',
      fixedCosts: '50000',
      variableUnitCost: '1200',
    });
    expect(s.warnings.map((w) => w.code).sort()).toEqual(['NEGATIVE_PROFIT', 'NO_BREAK_EVEN']);
  });
});

describe('historial de costos', () => {
  it('promedio ponderado por cantidad', () => {
    expect(
      weightedAverageUnitCost([
        { quantity: '10', unitCost: '2000' },
        { quantity: '30', unitCost: '2400' },
      ]),
    ).toBe('2300.000000');
    expect(weightedAverageUnitCost([])).toBeNull();
  });

  it('variación porcentual', () => {
    expect(r2(percentChange('2000', '2240'))).toBe('0.12');
    expect(percentChange('0', '10')).toBeNull();
  });
});
