import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword } from '../src/core/auth/password.js';
import {
  Client,
  PASSWORD,
  buildTestApp,
  inviteAndLogin,
  signUpBusiness,
  uniqueEmail,
  type TestApp,
} from './helpers.js';

/**
 * Pruebas multi-tenant obligatorias (SOP §38). Gate de la Etapa 3: todas deben pasar.
 */
let t: TestApp;
let a: Client;
let b: Client;
const B: Record<string, string> = {};

beforeAll(async () => {
  t = await buildTestApp();
  ({ client: a } = await signUpBusiness(t.app, 'Negocio A'));
  ({ client: b } = await signUpBusiness(t.app, 'Negocio B'));
  B.supplier = (await b.post('/suppliers', { name: 'Proveedor de B' })).json().uuid;
  B.ingredient = (
    await b.post('/ingredients', {
      name: 'Ingrediente secreto de B',
      unit: 'kg',
      initialCost: { price: '1000', quantity: '1', unit: 'kg' },
    })
  ).json().uuid;
  B.product = (
    await b.post('/products', {
      name: 'Receta secreta de B',
      portions: '1',
      currentPrice: '5000',
      items: [{ ingredientUuid: B.ingredient, quantity: '100', unit: 'g' }],
    })
  ).json().uuid;
  B.purchase = (
    await b.post('/purchases', {
      purchasedAt: '2026-09-15',
      items: [{ ingredientUuid: B.ingredient, quantity: '1', unit: 'kg', lineTotal: '1100' }],
    })
  ).json().uuid;
  B.scenario = (
    await b.post('/scenarios', {
      name: 'Escenario B',
      price: '5000',
      unitsPerDay: '10',
      daysPerMonth: 26,
      variableUnitCost: '100',
    })
  ).json().uuid;
});
afterAll(() => t.close());

describe('aislamiento entre negocios', () => {
  it('A no ve ingredientes de B (listado ni detalle)', async () => {
    const list = (await a.get('/ingredients')).json();
    expect(list.items.map((i: { name: string }) => i.name)).not.toContain(
      'Ingrediente secreto de B',
    );
    expect((await a.get(`/ingredients/${B.ingredient}`)).statusCode).toBe(404);
    expect((await a.get(`/ingredients/${B.ingredient}/history`)).statusCode).toBe(404);
  });

  it('A no ve recetas, compras, proveedores ni escenarios de B', async () => {
    expect((await a.get(`/products/${B.product}`)).statusCode).toBe(404);
    expect((await a.get(`/purchases/${B.purchase}`)).statusCode).toBe(404);
    expect((await a.get(`/suppliers/${B.supplier}`)).statusCode).toBe(404);
    expect((await a.get(`/scenarios/${B.scenario}`)).statusCode).toBe(404);
    expect((await a.get('/products')).json().items).toHaveLength(0);
    expect((await a.get('/purchases')).json().items).toHaveLength(0);
  });

  it('A no puede modificar, archivar, duplicar ni anular datos de B (UUID manipulado)', async () => {
    expect((await a.post(`/ingredients/${B.ingredient}/archive`)).statusCode).toBe(404);
    expect(
      (
        await a.post(`/ingredients/${B.ingredient}/costs`, {
          price: '1',
          quantity: '1',
          unit: 'kg',
        })
      ).statusCode,
    ).toBe(404);
    expect((await a.post(`/products/${B.product}/duplicate`, { name: 'robado' })).statusCode).toBe(
      404,
    );
    expect((await a.post(`/purchases/${B.purchase}/void`)).statusCode).toBe(404);
    expect(
      (await a.patch(`/products/${B.product}/price`, { currentPrice: '1', rowVersion: 1 }))
        .statusCode,
    ).toBe(404);
    const stillThere = (await b.get(`/products/${B.product}`)).json();
    expect(stillThere.currentPrice).toBe('5000');
  });

  it('A no puede usar ingredientes, proveedores ni productos de B en sus registros', async () => {
    const recipe = await a.post('/products', {
      name: 'Intento',
      portions: '1',
      items: [{ ingredientUuid: B.ingredient, quantity: '1', unit: 'kg' }],
    });
    expect(recipe.statusCode).toBe(422);
    const purchase = await a.post('/purchases', {
      purchasedAt: '2026-09-15',
      items: [{ ingredientUuid: B.ingredient, quantity: '1', unit: 'kg', lineTotal: '1' }],
    });
    expect(purchase.statusCode).toBe(422);
    const own = (await a.post('/ingredients', { name: 'Sal', unit: 'kg' })).json().uuid;
    const withSupplier = await a.post('/purchases', {
      supplierUuid: B.supplier,
      purchasedAt: '2026-09-15',
      items: [{ ingredientUuid: own, quantity: '1', unit: 'kg', lineTotal: '1' }],
    });
    expect(withSupplier.statusCode).toBe(422);
    const scenario = await a.post('/scenarios', {
      name: 'x',
      productUuid: B.product,
      price: '1',
      unitsPerDay: '1',
      daysPerMonth: 1,
      variableUnitCost: '0',
    });
    expect([404, 422]).toContain(scenario.statusCode);
  });

  it('enviar tenant_id en el cuerpo no tiene efecto', async () => {
    const r = await a.post('/suppliers', {
      name: 'Proveedor con tenant falso',
      tenant_id: 1,
      tenantId: 1,
      tenantUuid: 'x',
    });
    expect(r.statusCode).toBe(201);
    const bList = (await b.get('/suppliers')).json();
    expect(bList.items.map((s: { name: string }) => s.name)).not.toContain(
      'Proveedor con tenant falso',
    );
  });

  it('A no descarga reportes ni respaldo con datos de B', async () => {
    const sheet = await a.get(`/reports/product-sheet?format=pdf&product=${B.product}`);
    expect(sheet.statusCode).toBe(404);
    const backup = JSON.parse((await a.get('/reports/backup?format=json')).body);
    expect(JSON.stringify(backup)).not.toContain('secreto');
    const csv = (await a.get('/reports/ingredients?format=csv')).body;
    expect(csv).not.toContain('secreto');
  });

  it('la sincronización solo entrega datos del propio negocio', async () => {
    const changes = (await a.get('/sync/changes?entity=ingredients')).json();
    expect(JSON.stringify(changes)).not.toContain('secreto');
    const products = (await a.get('/sync/changes?entity=products')).json();
    expect(products.items).toHaveLength(0);
  });

  it('la auditoría de A no muestra eventos de B', async () => {
    const audit = (await a.get('/tenant/audit')).json();
    expect(JSON.stringify(audit)).not.toContain(B.product);
  });
});

describe('roles y permisos', () => {
  it('viewer solo lee; no puede crear ni cambiar precios', async () => {
    const viewer = await inviteAndLogin(t.app, a, 'viewer');
    expect((await viewer.get('/ingredients')).statusCode).toBe(200);
    expect((await viewer.post('/ingredients', { name: 'X', unit: 'kg' })).statusCode).toBe(403);
    expect((await viewer.get('/reports/products?format=csv')).statusCode).toBe(403);
  });

  it('operator registra compras pero no cambia recetas ni precios', async () => {
    const op = await inviteAndLogin(t.app, a, 'operator');
    const ing = (await a.post('/ingredients', { name: 'Azúcar', unit: 'kg' })).json().uuid;
    expect(
      (
        await op.post('/purchases', {
          purchasedAt: '2026-09-20',
          items: [{ ingredientUuid: ing, quantity: '2', unit: 'kg', lineTotal: '1800' }],
        })
      ).statusCode,
    ).toBe(201);
    expect((await op.post('/products', { name: 'Y', portions: '1' })).statusCode).toBe(403);
    const prod = (await a.post('/products', { name: 'Postre', portions: '1' })).json();
    expect(
      (
        await op.patch(`/products/${prod.uuid}/price`, {
          currentPrice: '1',
          rowVersion: prod.rowVersion,
        })
      ).statusCode,
    ).toBe(403);
  });

  it('un administrador del negocio no accede al panel global', async () => {
    const admin = await inviteAndLogin(t.app, a, 'tenant_admin');
    for (const url of [
      '/admin/metrics',
      '/admin/tenants',
      '/admin/users',
      '/admin/audit',
      '/admin/ai-usage',
    ]) {
      expect((await admin.get(url)).statusCode, url).toBe(403);
      expect((await a.get(url)).statusCode, url).toBe(403);
    }
  });

  it('un admin no puede asignar un rol igual o superior al suyo', async () => {
    const admin = await inviteAndLogin(t.app, a, 'tenant_admin');
    const email = uniqueEmail('m');
    const created = (
      await admin.post('/tenant/users', { name: 'M', email, role: 'manager' })
    ).json();
    expect(
      (
        await admin.patch(`/tenant/users/${created.uuid}`, {
          role: 'tenant_admin',
          status: 'active',
        })
      ).statusCode,
    ).toBe(403);
  });

  it('un usuario bloqueado no puede ingresar ni refrescar su sesión', async () => {
    const email = uniqueEmail('blk');
    const invited = (await a.post('/tenant/users', { name: 'Bloq', email, role: 'viewer' })).json();
    const c = new Client(t.app);
    const { lastMailToken } = await import('./helpers.js');
    await c.post('/auth/accept-invite', {
      token: await lastMailToken(t.app, email),
      password: PASSWORD,
    });
    expect((await c.post('/auth/login', { email, password: PASSWORD })).statusCode).toBe(200);
    expect(
      (await a.patch(`/tenant/users/${invited.uuid}`, { role: 'viewer', status: 'blocked' }))
        .statusCode,
    ).toBe(200);
    expect((await c.post('/auth/refresh')).statusCode).toBe(401);
    expect(
      (await new Client(t.app).post('/auth/login', { email, password: PASSWORD })).statusCode,
    ).toBe(403);
  });
});

describe('panel global (solo super_admin)', () => {
  let admin: Client;
  beforeAll(async () => {
    const email = uniqueEmail('root');
    await t.db.call('sp_admin_super_create', [
      'Admin Plataforma',
      email,
      await hashPassword(PASSWORD),
    ]);
    admin = new Client(t.app);
    expect((await admin.post('/auth/login', { email, password: PASSWORD })).statusCode).toBe(200);
  });

  it('ve métricas, negocios y usuarios', async () => {
    const m = (await admin.get('/admin/metrics')).json();
    expect(m.tenantsActive).toBeGreaterThanOrEqual(2);
    const tenants = (await admin.get('/admin/tenants?q=Negocio')).json();
    expect(tenants.items.length).toBeGreaterThanOrEqual(2);
    expect((await admin.get('/admin/users?q=prueba.test')).statusCode).toBe(200);
  });

  it('no tiene acceso a datos operativos de los negocios', async () => {
    expect((await admin.get('/ingredients')).statusCode).toBe(409);
    expect((await admin.get(`/products/${B.product}`)).statusCode).toBe(409);
  });

  it('suspender un negocio corta el acceso de sus usuarios; reactivar lo devuelve', async () => {
    const tenants = (await admin.get('/admin/tenants?q=Negocio B')).json();
    const tb = tenants.items.find((x: { name: string }) => x.name === 'Negocio B');
    const detail = (
      await admin.post(`/admin/tenants/${tb.uuid}/status`, { status: 'suspended' })
    ).json();
    expect(detail.status).toBe('suspended');
    expect((await b.post('/auth/refresh')).statusCode).toBe(401);
    await admin.post(`/admin/tenants/${tb.uuid}/status`, { status: 'active' });
    const audit = (await admin.get('/admin/audit?action=admin.tenant')).json();
    expect(audit.map((x: { action: string }) => x.action)).toContain('admin.tenant_suspend');
  });

  it('activa y desactiva funciones por negocio', async () => {
    const tenants = (await admin.get('/admin/tenants?q=Negocio A')).json();
    const ta = tenants.items.find((x: { name: string }) => x.name === 'Negocio A');
    const flags = (
      await admin.put(`/admin/tenants/${ta.uuid}/flags/ai.chat`, { enabled: false })
    ).json();
    expect(flags.find((f: { code: string }) => f.code === 'ai.chat').enabled).toBe(false);
    const me = (await a.get('/auth/me')).json();
    expect(me.flags['ai.chat']).toBe(false);
    await admin.put(`/admin/tenants/${ta.uuid}/flags/ai.chat`, { enabled: null });
  });
});
