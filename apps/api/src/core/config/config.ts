import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * Configuración tipada de la API. Falla al iniciar si falta algo obligatorio.
 * Fuera de producción carga el `.env` de la raíz del monorepo (la carpeta con pnpm-workspace.yaml),
 * tanto desde `src/` (tsx) como desde `dist/` (bundle). En producción solo variables reales.
 */
function findRootEnv(): string | null {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      const env = join(dir, '.env');
      return existsSync(env) ? env : null;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

if (process.env.NODE_ENV !== 'production') {
  const rootEnv = findRootEnv();
  if (rootEnv) process.loadEnvFile(rootEnv);
}

/** Variables vacías en .env (CLAVE=) se tratan como no definidas. */
const blank = (v: unknown) => (v === '' ? undefined : v);

const bool = (def: boolean) =>
  z.preprocess(
    blank,
    z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .transform((v) => (v === undefined ? def : v === 'true' || v === '1')),
  );

const optionalBool = () =>
  z.preprocess(
    blank,
    z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  );

const csv = (def: string) =>
  z
    .string()
    .default(def)
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    API_HOST: z.string().default('0.0.0.0'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    /** URL pública de la web (enlaces en correos). */
    APP_URL: z.string().url().default('http://localhost:5173'),
    CORS_ORIGINS: csv('http://localhost:5173'),

    DB_HOST: z.string().default('127.0.0.1'),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().default(''),
    DB_NAME: z.string().min(1),
    DB_POOL_SIZE: z.coerce.number().int().positive().default(10),

    /** Secreto para cifrar el token de acceso (≥ 32 caracteres). Obligatorio fuera de dev/test. */
    JWT_ACCESS_SECRET: z.string().default(''),
    /** Cookies Secure. Por defecto activado en producción y staging. */
    COOKIE_SECURE: optionalBool(),

    /** Correo: 'smtp' (cualquier proveedor) o 'log' (desarrollo: no envía, guarda en memoria). */
    MAIL_DRIVER: z.enum(['smtp', 'log']).default('log'),
    MAIL_FROM: z.string().default('AImargen <no-reply@aimargen.com>'),
    SMTP_HOST: z.string().default(''),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().default(''),
    SMTP_PASSWORD: z.string().default(''),
    SMTP_SECURE: bool(false),

    /** Archivos subidos (facturas): 'local' o 's3' (S3-compatible). */
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('./storage'),
    S3_BUCKET: z.string().default(''),
    S3_REGION: z.string().default('us-east-1'),
    S3_ENDPOINT: z.string().default(''),
    S3_ACCESS_KEY_ID: z.string().default(''),
    S3_SECRET_ACCESS_KEY: z.string().default(''),
    S3_FORCE_PATH_STYLE: bool(false),
    UPLOAD_MAX_MB: z.coerce.number().positive().max(25).default(10),

    /** IA: 'anthropic' o 'none'. Sin clave, las funciones de IA se muestran como no configuradas. */
    AI_PROVIDER: z.enum(['anthropic', 'none']).default('none'),
    ANTHROPIC_API_KEY: z.string().default(''),
    AI_MODEL: z.string().default('claude-sonnet-5-5'),
    AI_BASE_URL: z.string().default('https://api.anthropic.com'),
    /** Costo estimado por millón de tokens (USD) para el registro de consumo. Ajustar al precio vigente. */
    AI_COST_INPUT_PER_MTOK: z.coerce.number().nonnegative().default(3),
    AI_COST_OUTPUT_PER_MTOK: z.coerce.number().nonnegative().default(15),
    /** Límite mensual de solicitudes de IA por negocio (0 = sin límite). */
    AI_MONTHLY_LIMIT: z.coerce.number().int().nonnegative().default(500),

    /** Token para GET /metrics. Si está vacío, /metrics solo responde fuera de producción. */
    METRICS_TOKEN: z.string().default(''),
    /** Límite global de solicitudes por IP y minuto (las rutas de auth tienen límites propios). */
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    /** Solo para pruebas automatizadas: desactiva los límites de solicitudes. */
    RATE_LIMIT_ENABLED: bool(true),
    /** Documentación OpenAPI en /api/docs. Por defecto desactivada en producción. */
    API_DOCS: optionalBool(),
    /** Bandeja de correos de prueba en /api/v1/dev/outbox (nunca en producción). */
    DEV_OUTBOX: bool(false),
  })
  .superRefine((c, ctx) => {
    const strict = c.NODE_ENV === 'production' || c.NODE_ENV === 'staging';
    if (strict && c.JWT_ACCESS_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'debe tener al menos 32 caracteres',
      });
    }
    if (c.NODE_ENV === 'production' && c.MAIL_DRIVER !== 'smtp') {
      ctx.addIssue({ code: 'custom', path: ['MAIL_DRIVER'], message: 'producción requiere smtp' });
    }
    if (c.MAIL_DRIVER === 'smtp' && !c.SMTP_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'requerido con MAIL_DRIVER=smtp',
      });
    }
    if (
      c.STORAGE_DRIVER === 's3' &&
      (!c.S3_BUCKET || !c.S3_ACCESS_KEY_ID || !c.S3_SECRET_ACCESS_KEY)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_BUCKET'],
        message: 'S3 requiere bucket y credenciales',
      });
    }
    if (c.AI_PROVIDER === 'anthropic' && !c.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['ANTHROPIC_API_KEY'],
        message: 'requerida con AI_PROVIDER=anthropic',
      });
    }
    if (c.NODE_ENV === 'production' && !c.RATE_LIMIT_ENABLED) {
      ctx.addIssue({
        code: 'custom',
        path: ['RATE_LIMIT_ENABLED'],
        message: 'no se puede desactivar en producción',
      });
    }
    if (c.NODE_ENV === 'production' && c.DEV_OUTBOX) {
      ctx.addIssue({ code: 'custom', path: ['DEV_OUTBOX'], message: 'no permitido en producción' });
    }
  });

export type AppConfig = z.infer<typeof schema>;

/** Secreto de desarrollo: solo se usa si no hay JWT_ACCESS_SECRET y el entorno es dev/test. */
const DEV_SECRET = 'aimargen-dev-secret-no-usar-en-produccion-0123456789';

export function loadConfig(overrides: Partial<Record<string, string>> = {}): AppConfig {
  const parsed = schema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${detail}`);
  }
  const c = parsed.data;
  if (!c.JWT_ACCESS_SECRET) c.JWT_ACCESS_SECRET = DEV_SECRET;
  if (c.COOKIE_SECURE === undefined)
    c.COOKIE_SECURE = c.NODE_ENV === 'production' || c.NODE_ENV === 'staging';
  return c;
}

export const APP_VERSION = process.env.APP_VERSION ?? process.env.npm_package_version ?? '0.0.0';
