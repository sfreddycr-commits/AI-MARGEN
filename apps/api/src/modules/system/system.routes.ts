import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { SystemController } from './system.controller.js';

/**
 * Rutas del módulo system. Públicas (sin auth) para orquestadores y monitoreo.
 *  - GET /health/live  → proceso vivo (no toca la BD)
 *  - GET /health/ready → BD + migraciones listas (503 si no)
 *  - GET /health       → alias de ready para monitoreo simple
 */
export function systemRoutes(controller: SystemController): FastifyPluginAsync {
  return async (app) => {
    app.get('/health/live', async () => controller.liveness());

    const ready = async (_req: unknown, reply: FastifyReply) => {
      const { ready: ok, body } = await controller.readiness();
      return reply.status(ok ? 200 : 503).send(body);
    };
    app.get('/health/ready', ready);
    app.get('/health', ready);
  };
}
