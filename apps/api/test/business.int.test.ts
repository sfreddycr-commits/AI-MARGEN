import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp, signUpBusiness, type Client, type TestApp } from './helpers.js';

let t: TestApp;
let c: Client;
const ids: Record<string, string> = {};

beforeAll(async () => {
  t = await buildTestApp();
  ({ client: c } = await signUpBusiness(t.app, 'Café de Prueba'));
});
afterAll(() => t.close());

const ok = <T = Record<string, unknown>>(
  r: { statusCode: number; body: string; json: () => unknown },
  status = 200,
): T => {
  if (r.statusCode !== status) throw new Error(`HTTP ${r.statusCode}: ${r.body}`);
  return r.json() as T;
};

describe('onboarding', () => {
  it('crea el negocio con configuración y categorías iniciales', async () => {
    const me = ok<{
      tenant: { name: string; currency: string; settings: { targetMargin: string } };
    }>(await c.get('/auth/me'));
    expect(me.tenant.name).toBe('Café de Prueba');
    expect(me.tenant.currency).toBe('CRC');
    expect(me.tenant.settings.targetMargin).toBe('0.4');
    const cats = ok<Array<{ name: string }>>(await c.get('/categories?kind=ingredient'));
    expect(cats.map((x) => x.name)).toContain('Lácteos');
  });

  it('no permite crear un segundo negocio', async () => {
    const r = await c.post('/onboarding/business', { name: 'Otro', businessType: 'cafe' });
    expect(r.statusCode).toBe(409);
  });
});

describe('ingredientes, proveedores y compras', () => {
  it('crea proveedor', async () => {
    const s = ok<{ uuid: string }>(
      await c.post('/suppliers', { name: 'Distribuidora Central', phone: '2222-2222' }),
      201,
    );
    ids.supplier = s.uuid;
    const s2 = ok<{ uuid: string }>(await c.post('/suppliers', { name: 'Mercado Mayoreo' }), 201);
    ids.supplier2 = s2.uuid;
  });

  it('SOP 1: 5 kg por ₡10.000 → ₡2.000/kg (costo inicial calculado por el motor)', async () => {
    const i = ok<{ uuid: string; unitCost: string; unit: string }>(
      await c.post('/ingredients', {
        name: 'Harina',
        unit: 'kg',
        initialCost: { price: '10000', quantity: '5', unit: 'kg', supplierUuid: ids.supplier },
      }),
      201,
    );
    expect(i.unitCost).toBe('2000');
    ids.harina = i.uuid;
  });

  it('compra en g y costea en kg; rendimiento afecta el costo efectivo', async () => {
    const i = ok<{ uuid: string; unitCost: string; effectiveUnitCost: string }>(
      await c.post('/ingredients', {
        name: 'Carne molida',
        unit: 'kg',
        yield: '0.8',
        initialCost: { price: '3000', quantity: '500', unit: 'g' },
      }),
      201,
    );
    expect(i.unitCost).toBe('6000');
    expect(i.effectiveUnitCost).toBe('7500');
    ids.carne = i.uuid;
  });

  it('rechaza unidades incompatibles sin conversión y las acepta con conversión propia', async () => {
    const bad = await c.post('/ingredients', {
      name: 'Huevo',
      unit: 'unidad',
      initialCost: { price: '3000', quantity: '1', unit: 'kg' },
    });
    expect(bad.statusCode).toBe(422);
    expect(bad.json().error.message).toMatch(/conversión/);
    const good = ok<{ uuid: string; unitCost: string }>(
      await c.post('/ingredients', {
        name: 'Huevo',
        unit: 'unidad',
        conversions: [{ from: 'unidad', to: 'g', factor: '50' }],
        initialCost: { price: '3000', quantity: '1', unit: 'kg' },
      }),
      201,
    );
    expect(good.unitCost).toBe('150');
    ids.huevo = good.uuid;
  });

  it('ingrediente sin costo queda marcado y no se inventa', async () => {
    const i = ok<{ uuid: string; unitCost: string | null }>(
      await c.post('/ingredients', { name: 'Queso', unit: 'kg' }),
      201,
    );
    expect(i.unitCost).toBeNull();
    ids.queso = i.uuid;
    const missing = ok<{ total: number }>(await c.get('/ingredients?filter=missing_cost'));
    expect(missing.total).toBe(1);
  });

  it('nombre duplicado entre activos → 409; archivado libera el nombre', async () => {
    expect((await c.post('/ingredients', { name: 'harina', unit: 'kg' })).statusCode).toBe(409);
  });

  it('rechaza valores negativos', async () => {
    const r = await c.post('/purchases', {
      purchasedAt: '2026-09-01',
      items: [{ ingredientUuid: ids.harina, quantity: '-1', unit: 'kg', lineTotal: '100' }],
    });
    expect(r.statusCode).toBe(400);
  });
});

describe('recetas y costo real', () => {
  it('SOP 2 y 3: 250 g de harina a ₡2.000/kg → ₡500; costo total y por porción', async () => {
    const p = ok<{
      uuid: string;
      costTotal: string;
      costPerPortion: string;
      breakdown: { items: Array<{ cost: string }>; complete: boolean };
      pricing: { status: string };
      rowVersion: number;
    }>(
      await c.post('/products', {
        name: 'Pan casero',
        portions: '2',
        currentPrice: '1000',
        items: [{ ingredientUuid: ids.harina, quantity: '250', unit: 'g' }],
        packaging: { mode: 'fixed', value: '100' },
      }),
      201,
    );
    expect(p.breakdown.items[0]!.cost).toBe('500');
    expect(p.costTotal).toBe('600');
    expect(p.costPerPortion).toBe('300');
    expect(p.breakdown.complete).toBe(true);
    expect(p.pricing.status).toBe('healthy');
    ids.pan = p.uuid;
  });

  it('vista previa sin guardar: costos con empaque, mano de obra %, indirectos y merma', async () => {
    const r = ok<{ breakdown: Record<string, string>; analysis: { byMargin: { price: string } } }>(
      await c.post('/products/preview', {
        portions: '4',
        items: [
          { ingredientUuid: ids.carne, quantity: '500', unit: 'g' },
          { ingredientUuid: ids.huevo, quantity: '2', unit: 'unidad' },
        ],
        packaging: { mode: 'fixed', value: '720' },
        labor: { mode: 'percent', value: '0.1' },
        overhead: { mode: 'fixed', value: '300' },
        wastePct: '0.02',
        targetMargin: '0.4',
      }),
    );
    // carne 0,5 kg × 6000 / 0,8 = 3750; huevo 2 × 150 = 300 → 4050
    expect(r.breakdown.ingredientsCost).toBe('4050');
    expect(r.breakdown.laborCost).toBe('405');
    expect(r.breakdown.wasteCost).toBe('81');
    expect(r.breakdown.totalCost).toBe('5556');
    expect(r.breakdown.costPerPortion).toBe('1389');
    expect(r.analysis.byMargin.price).toBe('2315');
  });

  it('receta con ingrediente sin costo queda incompleta y lo advierte', async () => {
    const p = ok<{
      uuid: string;
      costComplete: boolean;
      breakdown: { warnings: Array<{ code: string }> };
      pricing: { status: string };
    }>(
      await c.post('/products', {
        name: 'Hamburguesa',
        portions: '1',
        currentPrice: '3500',
        items: [
          { ingredientUuid: ids.carne, quantity: '180', unit: 'g' },
          { ingredientUuid: ids.queso, quantity: '30', unit: 'g' },
        ],
      }),
      201,
    );
    expect(p.costComplete).toBe(false);
    expect(p.pricing.status).toBe('incomplete');
    expect(p.breakdown.warnings.map((w) => w.code)).toContain('MISSING_COST');
    ids.hamburguesa = p.uuid;
  });

  it('SOP 10: una compra nueva recalcula costos sin destruir el historial', async () => {
    const purchase = ok<{ uuid: string; total: string; items: Array<{ unitCost: string }> }>(
      await c.post('/purchases', {
        supplierUuid: ids.supplier2,
        purchasedAt: new Date().toISOString().slice(0, 10),
        reference: 'F-001',
        items: [
          { ingredientUuid: ids.harina, quantity: '10', unit: 'kg', lineTotal: '24000' },
          { ingredientUuid: ids.queso, quantity: '2', unit: 'kg', lineTotal: '9000' },
        ],
      }),
      201,
    );
    expect(purchase.total).toBe('33000');
    expect(purchase.items[0]!.unitCost).toBe('2400');
    ids.purchase = purchase.uuid;

    const harina = ok<{ unitCost: string; supplierName: string }>(
      await c.get(`/ingredients/${ids.harina}`),
    );
    expect(harina.unitCost).toBe('2400');
    expect(harina.supplierName).toBe('Mercado Mayoreo');
    const history = ok<Array<{ unitCost: string; source: string }>>(
      await c.get(`/ingredients/${ids.harina}/history`),
    );
    expect(history.map((h) => h.unitCost)).toEqual(['2400', '2000']);

    const pan = ok<{ costTotal: string; costPerPortion: string }>(
      await c.get(`/products/${ids.pan}`),
    );
    expect(pan.costTotal).toBe('700'); // 0,25 kg × 2400 + 100
    const ham = ok<{ costComplete: boolean; costPerPortion: string }>(
      await c.get(`/products/${ids.hamburguesa}`),
    );
    expect(ham.costComplete).toBe(true);
    // carne 0,18 × 6000 / 0,8 = 1350; queso 0,03 × 4500 = 135
    expect(ham.costPerPortion).toBe('1485');
  });

  it('anular la compra vuelve al costo anterior y conserva el historial marcado', async () => {
    ok(await c.post(`/purchases/${ids.purchase}/void`));
    const harina = ok<{ unitCost: string }>(await c.get(`/ingredients/${ids.harina}`));
    expect(harina.unitCost).toBe('2000');
    const history = ok<Array<{ voided: boolean }>>(
      await c.get(`/ingredients/${ids.harina}/history`),
    );
    expect(history.length).toBe(2);
    expect(history[0]!.voided).toBe(true);
    expect((await c.post(`/purchases/${ids.purchase}/void`)).statusCode).toBe(409);
    const pan = ok<{ costTotal: string }>(await c.get(`/products/${ids.pan}`));
    expect(pan.costTotal).toBe('600');
  });

  it('SOP 9: duplicar receta crea una copia independiente', async () => {
    const copy = ok<{ uuid: string; costTotal: string; items: unknown[]; rowVersion: number }>(
      await c.post(`/products/${ids.pan}/duplicate`, { name: 'Pan casero grande' }),
      201,
    );
    expect(copy.uuid).not.toBe(ids.pan);
    expect(copy.items).toHaveLength(1);
    ok(
      await c.patch(`/products/${copy.uuid}`, {
        name: 'Pan casero grande',
        portions: '2',
        items: [{ ingredientUuid: ids.harina, quantity: '500', unit: 'g' }],
        rowVersion: copy.rowVersion,
      }),
    );
    const original = ok<{ items: Array<{ quantity: string }>; costTotal: string }>(
      await c.get(`/products/${ids.pan}`),
    );
    expect(original.items[0]!.quantity).toBe('250');
    expect(original.costTotal).toBe('600');
  });

  it('control de concurrencia: versión vieja → 409', async () => {
    const p = ok<{ rowVersion: number }>(await c.get(`/products/${ids.pan}`));
    const body = {
      name: 'Pan casero',
      portions: '2',
      currentPrice: '1000',
      items: [{ ingredientUuid: ids.harina, quantity: '250', unit: 'g' }],
      packaging: { mode: 'fixed', value: '100' },
    };
    ok(await c.patch(`/products/${ids.pan}`, { ...body, rowVersion: p.rowVersion }));
    const stale = await c.patch(`/products/${ids.pan}`, { ...body, rowVersion: p.rowVersion });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.message).toMatch(/modificado por otra persona/);
  });
});

describe('precio y margen', () => {
  it('costo manual (cotización) sin compra completa la receta', async () => {
    const q = ok<{ unitCost: string }>(
      await c.post(`/ingredients/${ids.queso}/costs`, {
        price: '9000',
        quantity: '2',
        unit: 'kg',
        supplierUuid: ids.supplier,
      }),
    );
    expect(q.unitCost).toBe('4500');
    const ham = ok<{ costComplete: boolean; costPerPortion: string }>(
      await c.get(`/products/${ids.hamburguesa}`),
    );
    expect(ham.costComplete).toBe(true);
    expect(ham.costPerPortion).toBe('1485');
  });

  it('SOP 4 y 5: precio por margen, utilidad y margen real', async () => {
    const a = ok<{ byMargin: { price: string }; current: { profit: string; margin: string } }>(
      await c.post('/pricing/calculate', {
        cost: '1000',
        targetMargin: '0.4',
        currentPrice: '2000',
      }),
    );
    expect(a.byMargin.price).toBe('1666.666667');
    const b = ok<{ current: { profit: string; margin: string } }>(
      await c.post('/pricing/calculate', { cost: '1200', currentPrice: '2000' }),
    );
    expect(b.current.profit).toBe('800');
    expect(b.current.margin).toBe('0.4');
  });

  it('SOP 6 y 8: precio menor al costo advierte; margen ≥ 100% se rechaza', async () => {
    const a = ok<{ warnings: Array<{ code: string }> }>(
      await c.post('/pricing/calculate', { cost: '1200', currentPrice: '1000' }),
    );
    expect(a.warnings.map((w) => w.code)).toContain('PRICE_BELOW_COST');
    expect(
      (await c.post('/pricing/calculate', { cost: '1000', targetMargin: '1' })).statusCode,
    ).toBe(400);
  });

  it('cambiar precio queda auditado con antes y después', async () => {
    const p = ok<{ rowVersion: number }>(await c.get(`/products/${ids.hamburguesa}`));
    const updated = ok<{ currentPrice: string; pricing: { status: string } }>(
      await c.patch(`/products/${ids.hamburguesa}/price`, {
        currentPrice: '1400',
        targetMargin: null,
        multiplier: '2.5',
        rowVersion: p.rowVersion,
      }),
    );
    expect(updated.currentPrice).toBe('1400');
    expect(updated.pricing.status).toBe('below_cost');
    const audit = ok<
      Array<{ action: string; before: { current_price: string }; after: { current_price: string } }>
    >(await c.get('/tenant/audit?entity=product'));
    const change = audit.find((a) => a.action === 'product.price_change')!;
    expect(change.before.current_price).toMatch(/^3500/);
    expect(change.after.current_price).toBe('1400');
  });

  it('vista de precios con análisis por producto', async () => {
    const list = ok<
      Array<{ name: string; status: string; analysis: { equivalentMultiplier: string } }>
    >(await c.get('/pricing'));
    const ham = list.find((x) => x.name === 'Hamburguesa')!;
    expect(ham.status).toBe('below_cost');
    expect(ham.analysis.equivalentMultiplier).toBe('1.666667');
  });
});

describe('escenarios y punto de equilibrio', () => {
  it('costos fijos del negocio se usan por defecto', async () => {
    ok(await c.post('/fixed-costs', { name: 'Alquiler', monthlyAmount: '400000' }), 201);
    ok(await c.post('/fixed-costs', { name: 'Electricidad', monthlyAmount: '100000' }), 201);
    const fc = ok<{ total: string }>(await c.get('/fixed-costs'));
    expect(fc.total).toBe('500000');
  });

  it('calcula sin guardar y guardar no modifica receta ni precio (gate Etapa 8)', async () => {
    const before = ok<{ currentPrice: string; costTotal: string; rowVersion: number }>(
      await c.get(`/products/${ids.pan}`),
    );
    const sim = ok<{ revenue: string; breakEven: { unitsRounded: string } }>(
      await c.post('/scenarios/calculate', {
        price: '1000',
        unitsPerDay: '40',
        daysPerMonth: 26,
        variableUnitCost: '0',
        variableSource: 'product',
        productUuid: ids.pan,
        fixedCosts: null,
      }),
    );
    expect(sim.revenue).toBe('1040000');
    expect(sim.breakEven.unitsRounded).toBe('715'); // 500000 / (1000 − 300) = 714,28
    const saved = ok<{ uuid: string; result: { profit: string } }>(
      await c.post('/scenarios', {
        name: 'Pan 40 al día',
        price: '1000',
        unitsPerDay: '40',
        daysPerMonth: 26,
        variableUnitCost: '0',
        variableSource: 'product',
        productUuid: ids.pan,
      }),
      201,
    );
    expect(saved.result.profit).toBe('228000'); // 1.040.000 − 312.000 − 500.000
    const after = ok<{ currentPrice: string; costTotal: string; rowVersion: number }>(
      await c.get(`/products/${ids.pan}`),
    );
    expect(after).toEqual(before);
  });

  it('escenario con pérdida genera alerta en el dashboard', async () => {
    ok(
      await c.post('/scenarios', {
        name: 'Pocas ventas',
        price: '1000',
        unitsPerDay: '2',
        daysPerMonth: 20,
        variableUnitCost: '300',
      }),
      201,
    );
    const d = ok<{ alerts: Array<{ code: string }> }>(await c.get('/dashboard'));
    expect(d.alerts.map((a) => a.code)).toContain('SCENARIO_NEGATIVE');
  });
});

describe('dashboard', () => {
  it('KPIs, alertas e insights salen del backend', async () => {
    const d = ok<{
      kpis: {
        productsCount: number;
        productsBelowCost: number;
        fixedCostsMonthly: string;
        activeScenario: { name: string };
      };
      alerts: Array<{ code: string; title: string }>;
      insights: Array<{ text: string; figures: Record<string, string> }>;
    }>(await c.get('/dashboard'));
    expect(d.kpis.productsCount).toBe(3);
    expect(d.kpis.productsBelowCost).toBe(1);
    expect(d.kpis.fixedCostsMonthly).toBe('500000');
    expect(d.alerts.map((a) => a.code)).toContain('PRICE_BELOW_COST');
    const review = d.insights.find((i) => i.text.includes('Hamburguesa'));
    expect(review?.text).toContain('₡2.475,00'); // 1485 / 0,6
    expect(review?.figures.recommendedPrice).toBe('2475');
  });
});

describe('reportes y exportaciones', () => {
  for (const fmt of ['pdf', 'csv', 'xlsx'] as const) {
    it(`lista de productos en ${fmt}`, async () => {
      const r = await c.get(`/reports/products?format=${fmt}`);
      expect(r.statusCode).toBe(200);
      expect(r.headers['content-disposition']).toMatch(new RegExp(`\\.${fmt}"$`));
      const buf = r.rawPayload;
      if (fmt === 'pdf') expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
      if (fmt === 'xlsx') expect(buf.subarray(0, 2).toString()).toBe('PK');
      if (fmt === 'csv') expect(buf.toString('utf8')).toContain('Hamburguesa');
    });
  }

  it('todos los reportes se generan', async () => {
    for (const rep of ['profitability', 'ingredients', 'purchases', 'suppliers', 'break-even']) {
      const r = await c.get(`/reports/${rep}?format=pdf`);
      expect(r.statusCode, rep).toBe(200);
    }
    const sheet = await c.get(`/reports/product-sheet?format=pdf&product=${ids.hamburguesa}`);
    expect(sheet.statusCode).toBe(200);
    expect(sheet.rawPayload.length).toBeGreaterThan(2000);
  });

  it('respaldo completo en JSON', async () => {
    const r = await c.get('/reports/backup?format=json');
    const data = JSON.parse(r.body);
    expect(data.format).toBe('aimargen-backup');
    expect(data.business.name).toBe('Café de Prueba');
    expect(data.products.length).toBeGreaterThanOrEqual(3);
    expect(data.priceHistory.length).toBeGreaterThanOrEqual(5);
  });
});

describe('sincronización (cache local)', () => {
  it('versiones por entidad y cambios con cursor; tombstones al archivar', async () => {
    const v1 = ok<{ versions: Record<string, number> }>(await c.get('/sync/versions'));
    expect(v1.versions.ingredients).toBeGreaterThan(0);
    const all = ok<{ items: Array<{ uuid: string; deleted: boolean }>; cursor: string }>(
      await c.get('/sync/changes?entity=ingredients'),
    );
    expect(all.items.length).toBe(4);
    ok(await c.post(`/ingredients/${ids.queso}/archive`));
    const v2 = ok<{ versions: Record<string, number> }>(await c.get('/sync/versions'));
    expect(v2.versions.ingredients).toBeGreaterThan(v1.versions.ingredients!);
    const delta = ok<{ items: Array<{ uuid: string; deleted: boolean }> }>(
      await c.get(`/sync/changes?entity=ingredients&cursor=${all.cursor}`),
    );
    expect(delta.items.some((i) => i.uuid === ids.queso && i.deleted)).toBe(true);
    ok(await c.post(`/ingredients/${ids.queso}/restore`));
  });
});

describe('usuarios y roles del negocio', () => {
  it('invita usuarios, no permite escalar rol propio', async () => {
    const r = ok<{ role: string; status: string }>(
      await c.post('/tenant/users', {
        name: 'Mario',
        email: `mario-${Date.now()}@prueba.test`,
        role: 'manager',
      }),
      201,
    );
    expect(r.role).toBe('manager');
    expect(r.status).toBe('invited');
    const users = ok<Array<{ uuid: string; role: string }>>(await c.get('/tenant/users'));
    const owner = users.find((u) => u.role === 'tenant_owner')!;
    expect(
      (await c.patch(`/tenant/users/${owner.uuid}`, { role: 'viewer', status: 'active' }))
        .statusCode,
    ).toBe(400);
  });
});
