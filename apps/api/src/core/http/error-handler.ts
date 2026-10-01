import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { CalculationError } from '@aimargen/calculation-engine';
import { DbError } from '../db/db-error.js';
import { AppError } from './app-error.js';

/** Mensajes en español para errores de base de datos (SOP regla 15). */
const DB_MESSAGES: Record<DbError['code'], { status: number; message: string }> = {
  ERR_NOT_FOUND: { status: 404, message: 'No se encontró el registro.' },
  ERR_CONFLICT: {
    status: 409,
    message: 'El registro fue modificado por otra persona. Recargue e intente de nuevo.',
  },
  ERR_DUPLICATE: { status: 409, message: 'Ya existe un registro con esos datos.' },
  ERR_FORBIDDEN: { status: 403, message: 'No tiene permiso para realizar esta acción.' },
  ERR_VALIDATION: { status: 422, message: 'Los datos enviados no son válidos.' },
  ERR_FK_VIOLATION: { status: 409, message: 'El registro está relacionado con otros datos.' },
  ERR_DB: { status: 500, message: 'Ocurrió un error inesperado. Intente de nuevo.' },
};

/** Manejador central: respuestas uniformes `{ error: { code, message, requestId } }`. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    const requestId = req.id;

    if (hasZodFastifySchemaValidationErrors(err)) {
      const fields: Record<string, string> = {};
      for (const v of err.validation) {
        const path = v.instancePath.replace(/^\//, '').replace(/\//g, '.') || '_';
        fields[path] ??= v.message ?? 'Valor inválido.';
      }
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Revise los datos ingresados.',
          requestId,
          fields,
        },
      });
    }

    if (err instanceof AppError) {
      return reply
        .status(err.status)
        .send({ error: { code: err.code, message: err.message, requestId } });
    }

    if (err instanceof CalculationError) {
      return reply.status(422).send({
        error: {
          code: err.code,
          message: err.message,
          requestId,
          fields: { [err.field]: err.message },
        },
      });
    }

    if (err instanceof DbError) {
      const m = DB_MESSAGES[err.code];
      if (m.status >= 500) req.log.error({ err, sp: err.sp }, 'db error');
      return reply
        .status(m.status)
        .send({ error: { code: err.code, message: m.message, requestId } });
    }

    const fe = err as FastifyError;
    if (fe.statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Demasiadas solicitudes. Espere un momento e intente de nuevo.',
          requestId,
        },
      });
    }
    if (fe.statusCode && fe.statusCode >= 400 && fe.statusCode < 500) {
      return reply.status(fe.statusCode).send({
        error: { code: fe.code ?? 'BAD_REQUEST', message: 'Solicitud inválida.', requestId },
      });
    }

    req.log.error({ err }, 'unhandled error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocurrió un error inesperado. Intente de nuevo.',
        requestId,
      },
    });
  });

  app.setNotFoundHandler((req, reply) =>
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Recurso no encontrado.', requestId: req.id },
    }),
  );
}
