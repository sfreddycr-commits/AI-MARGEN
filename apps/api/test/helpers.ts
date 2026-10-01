import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig, type AppConfig } from '../src/core/config/config.js';
import { createDb, type Db } from '../src/core/db/db.js';
import type { AiProvider } from '../src/modules/ai/provider.js';

export interface TestApp {
  app: FastifyInstance;
  db: Db;
  config: AppConfig;
  close: () => Promise<void>;
}

/** Construye la API contra la base de pruebas, con correo en memoria y archivos en un directorio temporal. */
export async function buildTestApp(
  overrides: Partial<Record<string, string>> = {},
  opts: { ai?: AiProvider | null } = {},
): Promise<TestApp> {
  const config = loadConfig({
    DB_NAME: process.env.DB_NAME_TEST ?? 'aimargen_test',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    MAIL_DRIVER: 'log',
    DEV_OUTBOX: 'true',
    STORAGE_DRIVER: 'local',
    STORAGE_LOCAL_DIR: mkdtempSync(join(tmpdir(), 'aimargen-test-')),
    RATE_LIMIT_ENABLED: 'false',
    AI_PROVIDER: 'none',
    ...overrides,
  });
  const db = createDb({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });
  const app = await buildApp({ config, db, ai: opts.ai ?? null });
  await app.ready();
  return {
    app,
    db,
    config,
    close: async () => {
      await app.close();
      await db.close();
    },
  };
}

let seq = 0;
export const uniqueEmail = (prefix = 'u') =>
  `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}@prueba.test`;

/** Cliente HTTP de prueba que conserva cookies como un navegador y envía el header CSRF. */
export class Client {
  cookies = new Map<string, string>();
  constructor(readonly app: FastifyInstance) {}

  private store(res: LightMyRequestResponse) {
    for (const c of res.cookies) {
      if (c.value === '' || (c.expires && c.expires.getTime() < Date.now()))
        this.cookies.delete(c.name);
      else this.cookies.set(c.name, c.value);
    }
  }

  async req(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const res = await this.app.inject({
      method,
      url: `/api/v1${url}`,
      payload: body === undefined ? undefined : (body as object),
      headers: {
        'x-requested-with': 'aimargen-web',
        ...(this.cookies.size
          ? { cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') }
          : {}),
        ...headers,
      },
    });
    this.store(res);
    return res;
  }
  get = (url: string) => this.req('GET', url);
  post = (url: string, body: unknown = {}) => this.req('POST', url, body);
  patch = (url: string, body: unknown) => this.req('PATCH', url, body);
  put = (url: string, body: unknown) => this.req('PUT', url, body);
}

/** Último enlace enviado por correo a una dirección (driver 'log'). */
export async function lastMailToken(app: FastifyInstance, email: string): Promise<string> {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/dev/outbox?email=${encodeURIComponent(email)}`,
  });
  const [first] = res.json() as Array<{ link: string | null }>;
  const link = first?.link;
  if (!link) throw new Error(`No hay correo para ${email}`);
  return new URL(link).searchParams.get('token')!;
}

export const PASSWORD = 'Clave segura 123';

/** Registro → verificación → login → onboarding. Devuelve un cliente con sesión dentro del negocio. */
export async function signUpBusiness(
  app: FastifyInstance,
  business = 'Negocio de prueba',
  extra: Record<string, unknown> = {},
): Promise<{ client: Client; email: string; tenant: { uuid: string; name: string } }> {
  const client = new Client(app);
  const email = uniqueEmail();
  let r = await client.post('/auth/register', { name: 'Ana Pruebas', email, password: PASSWORD });
  if (r.statusCode !== 201) throw new Error(`register ${r.statusCode} ${r.body}`);
  r = await client.post('/auth/verify-email', { token: await lastMailToken(app, email) });
  if (r.statusCode !== 200) throw new Error(`verify ${r.statusCode} ${r.body}`);
  r = await client.post('/auth/login', { email, password: PASSWORD, remember: true });
  if (r.statusCode !== 200) throw new Error(`login ${r.statusCode} ${r.body}`);
  r = await client.post('/onboarding/business', {
    name: business,
    businessType: 'cafe',
    targetMargin: '0.4',
    operatingDays: 26,
    ...extra,
  });
  if (r.statusCode !== 201) throw new Error(`onboarding ${r.statusCode} ${r.body}`);
  return { client, email, tenant: r.json() };
}

/** Crea un usuario invitado con un rol y le define contraseña; devuelve su cliente con sesión. */
export async function inviteAndLogin(
  app: FastifyInstance,
  owner: Client,
  role: string,
): Promise<Client> {
  const email = uniqueEmail(role);
  const r = await owner.post('/tenant/users', { name: `Usuario ${role}`, email, role });
  if (r.statusCode !== 201) throw new Error(`invite ${r.statusCode} ${r.body}`);
  const client = new Client(app);
  await client.post('/auth/accept-invite', {
    token: await lastMailToken(app, email),
    password: PASSWORD,
  });
  const l = await client.post('/auth/login', { email, password: PASSWORD });
  if (l.statusCode !== 200) throw new Error(`login invitado ${l.statusCode} ${l.body}`);
  return client;
}
