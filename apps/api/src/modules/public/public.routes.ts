import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { contactInput } from '@aimargen/schemas';
import type { Db } from '../../core/db/db.js';

/** Rutas públicas de la landing (SOP §48): formulario de contacto. */
export function publicRoutes(db: Db): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    app.post(
      '/public/contact',
      {
        config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
        schema: { tags: ['public'], body: contactInput },
      },
      async (req, reply) => {
        // El campo trampa "website" debe venir vacío; los bots suelen llenarlo.
        if (!req.body.website) {
          await db.call('sp_contact_message_create', [
            req.body.name,
            req.body.email,
            req.body.business,
            req.body.message,
            req.ip,
          ]);
        }
        return reply.status(201).send({ ok: true });
      },
    );
  };
}
