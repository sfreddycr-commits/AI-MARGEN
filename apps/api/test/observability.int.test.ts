import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';
import { buildTestApp, type TestApp } from './helpers.js';

describe('observabilidad: métricas', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await buildTestApp();
  });
  afterAll(() => t.close());

  it('expone contadores por ruta (no por URL) en formato Prometheus', async () => {
    await t.app.inject({ method: 'GET', url: '/api/v1/health/live' });
    await t.app.inject({ method: 'GET', url: '/api/v1/no-existe-123' });
    const res = await t.app.inject({ method: 'GET', url: '/api/v1/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toMatch(
      /http_requests_total\{[^}]*method="GET",route="\/api\/v1\/health\/live",status="200"/,
    );
    expect(res.body).not.toContain('no-existe-123');
    expect(res.body).toContain('http_request_duration_seconds_bucket');
  });

  it('cuenta errores por tipo', async () => {
    await t.app.inject({ method: 'GET', url: '/api/v1/no-existe' });
    const res = await t.app.inject({ method: 'GET', url: '/api/v1/metrics' });
    expect(res.body).toContain('app_errors_total');
  });
});

describe('observabilidad: protección de /metrics', () => {
  it('con METRICS_TOKEN exige Bearer', async () => {
    const t = await buildTestApp({ METRICS_TOKEN: 'tok-secreto-123' });
    const denied = await t.app.inject({ method: 'GET', url: '/api/v1/metrics' });
    expect(denied.statusCode).toBe(401);
    expect(denied.json().error.message).toBe('No autorizado.');
    const ok = await t.app.inject({
      method: 'GET',
      url: '/api/v1/metrics',
      headers: { authorization: 'Bearer tok-secreto-123' },
    });
    expect(ok.statusCode).toBe(200);
    await t.close();
  });

  it('en producción sin token no se expone', async () => {
    const t = await buildTestApp({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'x'.repeat(40),
      MAIL_DRIVER: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      RATE_LIMIT_ENABLED: 'true',
      DEV_OUTBOX: 'false',
    });
    const res = await t.app.inject({ method: 'GET', url: '/api/v1/metrics' });
    expect(res.statusCode).toBe(404);
    await t.close();
  });
});

describe('OpenAPI', () => {
  it('publica la especificación fuera de producción', async () => {
    const t = await buildTestApp();
    const res = await t.app.inject({ method: 'GET', url: '/api/docs/json' });
    expect(res.statusCode).toBe(200);
    const spec = res.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(Object.keys(spec.paths)).toContain('/api/v1/health/live');
    expect(Object.keys(spec.paths)).not.toContain('/api/v1/metrics');
    await t.close();
  });

  it('no se publica en producción', async () => {
    const t = await buildTestApp({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'x'.repeat(40),
      MAIL_DRIVER: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      RATE_LIMIT_ENABLED: 'true',
      DEV_OUTBOX: 'false',
    });
    const res = await t.app.inject({ method: 'GET', url: '/api/docs/json' });
    expect(res.statusCode).toBe(404);
    await t.close();
  });
});

describe('rate limit', () => {
  it('responde 429 en español al superar el límite', async () => {
    const t = await buildTestApp({ RATE_LIMIT_MAX: '2', RATE_LIMIT_ENABLED: 'true' });
    const hit = () => t.app.inject({ method: 'GET', url: '/api/docs/json' });
    expect((await hit()).statusCode).toBe(200);
    expect((await hit()).statusCode).toBe(200);
    const blocked = await hit();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error).toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Demasiadas solicitudes. Espere un momento e intente de nuevo.',
    });
    // health queda excluido para no romper monitoreo
    expect((await t.app.inject({ method: 'GET', url: '/api/v1/health/live' })).statusCode).toBe(
      200,
    );
    await t.close();
  });
});

describe('auditoría', () => {
  it('app.audit.log escribe vía SP con contexto de la solicitud y redacción', async () => {
    const t = await buildTestApp();
    await t.app.audit.log(
      {
        requestId: 'req-audit-test-1',
        ip: '10.0.0.1',
        userAgent: 'vitest',
        tenantId: null,
        userId: null,
      },
      { action: 'platform.test', after: { name: 'x', password: 'nunca' } },
    );
    const conn = await mysql.createConnection({
      host: t.config.DB_HOST,
      port: t.config.DB_PORT,
      user: t.config.DB_USER,
      password: t.config.DB_PASSWORD,
      database: t.config.DB_NAME,
    });
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT ip, after_json FROM audit_logs WHERE request_id = 'req-audit-test-1'",
    );
    expect(rows[0]?.ip).toBe('10.0.0.1');
    expect(rows[0]?.after_json).toEqual({ name: 'x', password: '[REDACTADO]' });
    await conn.end();
    await t.close();
  });
});
