import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { APP_VERSION, type AppConfig } from './core/config/config.js';
import type { Db } from './core/db/db.js';
import { registerErrorHandler } from './core/http/error-handler.js';
import { createSystemModel } from './modules/system/system.model.js';
import { createSystemController } from './modules/system/system.controller.js';
import { systemRoutes } from './modules/system/system.routes.js';

export interface BuildAppDeps {
  config: AppConfig;
  db: Db;
}

/**
 * Construye la app Fastify sin escuchar en un puerto (permite pruebas con `app.inject`).
 * Cada módulo se arma como: model(db) → controller(model) → routes(controller).
 */
export async function buildApp({ config, db }: BuildAppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Nunca registrar secretos ni credenciales (SOP §34).
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
          '*.password',
          '*.token',
          '*.refreshToken',
        ],
        censor: '[REDACTADO]',
      },
    },
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      return typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming)
        ? incoming
        : randomUUID();
    },
    requestIdHeader: false,
    trustProxy: true,
    bodyLimit: 1_048_576,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
  });

  await app.register(helmet, {
    // La API solo devuelve JSON; la CSP de la web la define el servidor estático.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  });
  await app.register(cookie);

  registerErrorHandler(app);

  // --- Módulos ---
  const systemController = createSystemController(createSystemModel(db), APP_VERSION);

  await app.register(
    async (v1) => {
      await v1.register(systemRoutes(systemController));
    },
    { prefix: '/api/v1' },
  );

  return app;
}
