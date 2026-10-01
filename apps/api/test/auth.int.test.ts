import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Client,
  PASSWORD,
  buildTestApp,
  lastMailToken,
  signUpBusiness,
  uniqueEmail,
  type TestApp,
} from './helpers.js';

let t: TestApp;
beforeAll(async () => {
  t = await buildTestApp();
});
afterAll(() => t.close());

describe('registro y verificación de correo', () => {
  it('valida datos con mensajes en español', async () => {
    const c = new Client(t.app);
    const r = await c.post('/auth/register', {
      name: '',
      email: 'no-es-correo',
      password: 'corta',
    });
    expect(r.statusCode).toBe(400);
    const body = r.json();
    expect(body.error.message).toBe('Revise los datos ingresados.');
    expect(Object.values(body.error.fields).join(' ')).toMatch(/correo válido|al menos 8|nombre/);
  });

  it('no permite ingresar sin verificar el correo y luego sí', async () => {
    const c = new Client(t.app);
    const email = uniqueEmail();
    expect(
      (await c.post('/auth/register', { name: 'Luis', email, password: PASSWORD })).statusCode,
    ).toBe(201);
    const blocked = await c.post('/auth/login', { email, password: PASSWORD });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(
      (await c.post('/auth/verify-email', { token: await lastMailToken(t.app, email) })).statusCode,
    ).toBe(200);
    const ok = await c.post('/auth/login', { email, password: PASSWORD });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().user.email).toBe(email);
    expect(ok.json().tenant).toBeNull();
  });

  it('el token de verificación es de un solo uso', async () => {
    const c = new Client(t.app);
    const email = uniqueEmail();
    await c.post('/auth/register', { name: 'Eva', email, password: PASSWORD });
    const token = await lastMailToken(t.app, email);
    expect((await c.post('/auth/verify-email', { token })).statusCode).toBe(200);
    const again = await c.post('/auth/verify-email', { token });
    expect(again.statusCode).toBe(400);
    expect(again.json().error.code).toBe('TOKEN_INVALID');
  });

  it('rechaza correo duplicado', async () => {
    const { email } = await signUpBusiness(t.app);
    const r = await new Client(t.app).post('/auth/register', {
      name: 'Otro',
      email,
      password: PASSWORD,
    });
    expect(r.statusCode).toBe(409);
    expect(r.json().error.code).toBe('EMAIL_TAKEN');
  });

  it('las contraseñas se guardan con Argon2id, nunca en texto plano', async () => {
    const { email } = await signUpBusiness(t.app);
    const rows = await t.db.callOne<{ password_hash: string }>('sp_auth_user_get_by_email', [
      email,
    ]);
    expect(rows[0]!.password_hash).toMatch(/^\$argon2id\$/);
    expect(rows[0]!.password_hash).not.toContain(PASSWORD);
  });
});

describe('inicio de sesión', () => {
  it('un mismo mensaje para correo inexistente o contraseña incorrecta', async () => {
    const { email } = await signUpBusiness(t.app);
    const c = new Client(t.app);
    const a = await c.post('/auth/login', { email, password: 'incorrecta1' });
    const b = await c.post('/auth/login', { email: uniqueEmail(), password: 'incorrecta1' });
    expect(a.statusCode).toBe(401);
    expect(b.statusCode).toBe(401);
    expect(a.json().error.message).toBe(b.json().error.message);
  });

  it('bloquea la cuenta tras 5 intentos fallidos', async () => {
    const { email } = await signUpBusiness(t.app);
    const c = new Client(t.app);
    for (let i = 0; i < 5; i++) await c.post('/auth/login', { email, password: 'incorrecta1' });
    const locked = await c.post('/auth/login', { email, password: PASSWORD });
    expect(locked.statusCode).toBe(423);
    expect(locked.json().error.message).toMatch(/bloqueada temporalmente/);
  });

  it('cookies HttpOnly y SameSite; /auth/me devuelve permisos del rol', async () => {
    const c = new Client(t.app);
    const email = uniqueEmail();
    await c.post('/auth/register', { name: 'Sol', email, password: PASSWORD });
    await c.post('/auth/verify-email', { token: await lastMailToken(t.app, email) });
    const r = await c.post('/auth/login', { email, password: PASSWORD, remember: true });
    const access = r.cookies.find((x) => x.name === 'am_at')!;
    const refresh = r.cookies.find((x) => x.name === 'am_rt')!;
    expect(access.httpOnly).toBe(true);
    expect(access.sameSite).toBe('Lax');
    expect(refresh.path).toBe('/api/v1/auth');
    expect(refresh.maxAge).toBeGreaterThan(0);
    await c.post('/onboarding/business', { name: 'Soda Sol', businessType: 'soda' });
    const me = (await c.get('/auth/me')).json();
    expect(me.tenant.name).toBe('Soda Sol');
    expect(me.user.role).toBe('tenant_owner');
    expect(me.permissions).toContain('pricing.write');
    expect(me.permissions).not.toContain('platform.admin');
  });

  it('sin sesión las rutas protegidas responden 401', async () => {
    const r = await new Client(t.app).get('/ingredients');
    expect(r.statusCode).toBe(401);
    expect(r.json().error.message).toBe('Inicie sesión para continuar.');
  });

  it('antes del onboarding las rutas del negocio piden configurarlo', async () => {
    const c = new Client(t.app);
    const email = uniqueEmail();
    await c.post('/auth/register', { name: 'Raúl', email, password: PASSWORD });
    await c.post('/auth/verify-email', { token: await lastMailToken(t.app, email) });
    await c.post('/auth/login', { email, password: PASSWORD });
    const r = await c.get('/ingredients');
    expect(r.statusCode).toBe(409);
    expect(r.json().error.code).toBe('ONBOARDING_REQUIRED');
  });
});

describe('sesiones', () => {
  it('rota el refresh token y detecta reutilización', async () => {
    const { client } = await signUpBusiness(t.app);
    const oldRefresh = client.cookies.get('am_rt')!;
    const r1 = await client.post('/auth/refresh');
    expect(r1.statusCode).toBe(200);
    expect(client.cookies.get('am_rt')).not.toBe(oldRefresh);

    // Un atacante reutiliza el token viejo pasado el margen de concurrencia → se revoca la familia.
    const attacker = new Client(t.app);
    attacker.cookies.set('am_rt', oldRefresh);
    // Forzamos que el uso del token rotado parezca antiguo.
    const mysql = await import('mysql2/promise');
    const conn = await mysql.createConnection({
      host: t.config.DB_HOST,
      port: t.config.DB_PORT,
      user: t.config.DB_USER,
      password: t.config.DB_PASSWORD,
      database: t.config.DB_NAME,
    });
    await conn.query(
      'UPDATE user_sessions SET last_used_at = NOW(3) - INTERVAL 1 MINUTE WHERE replaced_by_id IS NOT NULL',
    );
    await conn.end();
    const reuse = await attacker.post('/auth/refresh');
    expect(reuse.statusCode).toBe(401);
    // La sesión legítima también quedó revocada.
    const legit = await client.post('/auth/refresh');
    expect(legit.statusCode).toBe(401);
  });

  it('dos refrescos simultáneos no cierran la sesión (409 reintentable)', async () => {
    const { client } = await signUpBusiness(t.app);
    const old = client.cookies.get('am_rt')!;
    expect((await client.post('/auth/refresh')).statusCode).toBe(200);
    const other = new Client(t.app);
    other.cookies.set('am_rt', old);
    expect((await other.post('/auth/refresh')).statusCode).toBe(409);
    expect((await client.post('/auth/refresh')).statusCode).toBe(200);
  });

  it('cerrar sesión revoca el refresh token', async () => {
    const { client } = await signUpBusiness(t.app);
    const rt = client.cookies.get('am_rt')!;
    expect((await client.post('/auth/logout')).statusCode).toBe(200);
    const again = new Client(t.app);
    again.cookies.set('am_rt', rt);
    expect((await again.post('/auth/refresh')).statusCode).toBe(401);
  });
});

describe('recuperación de contraseña', () => {
  it('responde igual exista o no la cuenta (no revela cuentas)', async () => {
    const { email } = await signUpBusiness(t.app);
    const c = new Client(t.app);
    const a = await c.post('/auth/forgot-password', { email });
    const b = await c.post('/auth/forgot-password', { email: uniqueEmail() });
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    expect(a.body).toBe(b.body);
  });

  it('cambia la contraseña con el enlace y cierra las sesiones anteriores', async () => {
    const { client, email } = await signUpBusiness(t.app);
    await new Client(t.app).post('/auth/forgot-password', { email });
    await new Promise((r) => setTimeout(r, 50));
    const token = await lastMailToken(t.app, email);
    const r = await new Client(t.app).post('/auth/reset-password', {
      token,
      password: 'Nueva clave 456',
    });
    expect(r.statusCode).toBe(200);
    expect((await client.post('/auth/refresh')).statusCode).toBe(401);
    const login = await new Client(t.app).post('/auth/login', {
      email,
      password: 'Nueva clave 456',
    });
    expect(login.statusCode).toBe(200);
  });
});

describe('protección CSRF', () => {
  it('rechaza mutaciones sin el header de la web o desde otro origen', async () => {
    const { client } = await signUpBusiness(t.app);
    const noHeader = await t.app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      payload: { name: 'X' },
      headers: { cookie: [...client.cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
    });
    expect(noHeader.statusCode).toBe(403);
    const evil = await client.req(
      'POST',
      '/suppliers',
      { name: 'X' },
      { origin: 'https://sitio-malicioso.example' },
    );
    expect(evil.statusCode).toBe(403);
  });
});
