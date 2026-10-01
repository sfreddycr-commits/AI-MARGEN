import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { SystemController } from './system.controller.js';
import type { Metrics } from '../../core/observability/metrics.js';
import { AppError } from '../../core/http/app-error.js';

const health = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.literal('aimargen-api'),
  version: z.string(),
  time: z.string(),
  checks: z.record(z.string(), z.enum(['ok', 'fail'])).optional(),
});

export interface SystemRoutesDeps {
  controller: SystemController;
  metrics: Metrics;
  metricsToken: string;
  isProduction: boolean;
}

/**
 * Rutas del módulo system. Públicas (sin auth) para orquestadores y monitoreo.
 *  - GET /health/live  → proceso vivo (no toca la BD)
 *  - GET /health/ready → BD + migraciones listas (503 si no)
 *  - GET /health       → alias de ready
 *  - GET /metrics      → Prometheus; requiere `Authorization: Bearer <METRICS_TOKEN>`
 */
export function systemRoutes(deps: SystemRoutesDeps): FastifyPluginAsync {
  const { controller, metrics, metricsToken, isProduction } = deps;
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    const tags = ['system'];

    app.get(
      '/health/live',
      {
        config: { rateLimit: false },
        schema: { tags, summary: 'Proceso vivo', response: { 200: health } },
      },
      async () => controller.liveness(),
    );

    const ready = async (_req: unknown, reply: FastifyReply) => {
      const { ready: ok, body } = await controller.readiness();
      return reply.status(ok ? 200 : 503).send(body);
    };
    const readyOpts = {
      config: { rateLimit: false as const },
      schema: { tags, summary: 'BD y migraciones listas', response: { 200: health, 503: health } },
    };
    app.get('/health/ready', readyOpts, ready);
    app.get('/health', readyOpts, ready);

    app.get(
      '/metrics',
      { config: { rateLimit: false }, schema: { hide: true } },
      async (req, reply) => {
        if (metricsToken) {
          if (req.headers.authorization !== `Bearer ${metricsToken}`) {
            throw new AppError(401, 'UNAUTHORIZED', 'No autorizado.');
          }
        } else if (isProduction) {
          throw new AppError(404, 'NOT_FOUND', 'Recurso no encontrado.');
        }
        reply.header('content-type', metrics.registry.contentType);
        return metrics.registry.metrics();
      },
    );
  };
}
