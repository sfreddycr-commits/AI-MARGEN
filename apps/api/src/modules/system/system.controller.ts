import type { HealthResponse } from '@aimargen/types';
import type { SystemModel } from './system.model.js';

/**
 * Controlador del módulo system: lógica de health/readiness.
 * Recibe datos de la ruta, procesa y consulta el modelo.
 */
export function createSystemController(model: SystemModel, version: string) {
  return {
    liveness(): HealthResponse {
      return { status: 'ok', service: 'aimargen-api', version, time: new Date().toISOString() };
    },

    async readiness(): Promise<{ ready: boolean; body: HealthResponse }> {
      const connection = await model.pingConnection();
      let schema: 'ok' | 'fail' = 'fail';
      if (connection) {
        try {
          const row = await model.ping();
          schema = row?.schema_version ? 'ok' : 'fail';
        } catch {
          schema = 'fail';
        }
      }
      const ready = connection && schema === 'ok';
      return {
        ready,
        body: {
          status: ready ? 'ok' : 'degraded',
          service: 'aimargen-api',
          version,
          time: new Date().toISOString(),
          checks: { database: connection ? 'ok' : 'fail', migrations: schema },
        },
      };
    },
  };
}

export type SystemController = ReturnType<typeof createSystemController>;
