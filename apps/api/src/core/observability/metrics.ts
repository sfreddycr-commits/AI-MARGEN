import type { FastifyInstance } from 'fastify';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Métricas Prometheus (SOP §34). Registro propio por instancia de app para que las pruebas
 * no compartan estado global.
 */
export interface Metrics {
  registry: Registry;
  httpRequests: Counter<'method' | 'route' | 'status'>;
  httpDuration: Histogram<'method' | 'route' | 'status'>;
  errors: Counter<'kind'>;
}

export function createMetrics(collectDefaults = true): Metrics {
  const registry = new Registry();
  registry.setDefaultLabels({ service: 'aimargen-api' });
  if (collectDefaults) collectDefaultMetrics({ register: registry });

  return {
    registry,
    httpRequests: new Counter({
      name: 'http_requests_total',
      help: 'Solicitudes HTTP atendidas',
      labelNames: ['method', 'route', 'status'],
      registers: [registry],
    }),
    httpDuration: new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duración de solicitudes HTTP',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [registry],
    }),
    errors: new Counter({
      name: 'app_errors_total',
      help: 'Errores de la aplicación por tipo',
      labelNames: ['kind'],
      registers: [registry],
    }),
  };
}

/** Registra hooks que miden cada solicitud usando la ruta (no la URL) para acotar cardinalidad. */
export function instrumentHttp(app: FastifyInstance, metrics: Metrics): void {
  app.addHook('onResponse', async (req, reply) => {
    const route = req.routeOptions.url ?? 'not_found';
    const labels = { method: req.method, route, status: String(reply.statusCode) };
    metrics.httpRequests.inc(labels);
    metrics.httpDuration.observe(labels, reply.elapsedTime / 1000);
  });
}
