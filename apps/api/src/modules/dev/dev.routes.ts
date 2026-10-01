import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Mailer } from '../../core/mail/mailer.js';

/**
 * Bandeja de correos de desarrollo/pruebas (driver 'log'). Solo se registra con DEV_OUTBOX=true
 * fuera de producción (la configuración rechaza DEV_OUTBOX en producción).
 */
export function devRoutes(mailer: Mailer): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    app.get(
      '/dev/outbox',
      { schema: { hide: true, querystring: z.object({ email: z.string().optional() }) } },
      async (req) => {
        const items = (mailer.outbox ?? []).filter(
          (m) => !req.query.email || m.to === req.query.email.toLowerCase(),
        );
        return items
          .slice(-20)
          .reverse()
          .map((m) => ({
            to: m.to,
            template: m.template,
            subject: m.subject,
            text: m.text,
            link: /(https?:\/\/\S+)/.exec(m.text)?.[1] ?? null,
          }));
      },
    );
  };
}
