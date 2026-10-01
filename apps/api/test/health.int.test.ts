import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/core/config/config.js';
import { createDb, type Db } from '../src/core/db/db.js';

let app: FastifyInstance;
let db: Db;

beforeAll(async () => {
  const config = loadConfig({
    DB_NAME: process.env.DB_NAME_TEST ?? 'aimargen_test',
    LOG_LEVEL: 'silent',
  });
  db = createDb({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });
  app = await buildApp({ config, db });
});

afterAll(async () => {
  await app.close();
  await db.close();
});

describe('API: health', () => {
  it('GET /api/v1/health/live → 200 sin tocar la BD', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health/live' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', service: 'aimargen-api' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('GET /api/v1/health/ready → 200 con BD y migraciones OK (vía sp_system_ping)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json().checks).toEqual({ database: 'ok', migrations: 'ok' });
  });

  it('ruta inexistente → 404 con mensaje en español y requestId', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/no-existe' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error.message).toBe('Recurso no encontrado.');
    expect(body.error.requestId).toBeTruthy();
  });

  it('propaga un x-request-id válido entrante', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
      headers: { 'x-request-id': 'req-test-123456' },
    });
    expect(res.headers['x-request-id']).toBe('req-test-123456');
  });

  it('aplica headers de seguridad (helmet)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health/live' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeTruthy();
  });
});

describe('API: readiness degradada', () => {
  it('responde 503 si la BD no está disponible', async () => {
    const config = loadConfig({ DB_PORT: '1', LOG_LEVEL: 'silent' });
    const badDb = createDb({
      host: '127.0.0.1',
      port: 1,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
    });
    const badApp = await buildApp({ config, db: badDb });
    const res = await badApp.inject({ method: 'GET', url: '/api/v1/health/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json().checks.database).toBe('fail');
    await badApp.close();
    await badDb.close();
  });
});
