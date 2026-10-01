import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  aiChatInput,
  aiRecipeDraftInput,
  productInput,
  purchaseInput,
  scenarioInput,
  uuid,
} from '@aimargen/schemas';
import { requirePermission, tenantCtx } from '../../core/auth/guards.js';
import { AppError } from '../../core/http/app-error.js';
import type { AiController } from './ai.controller.js';

const params = z.object({ uuid });

export function aiRoutes(c: AiController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    const tags = ['ai'];
    const use = requirePermission('ai.use');
    const confirm = (perm: string) => requirePermission('ai.confirm_actions', perm);
    const aiLimit = { rateLimit: { max: 20, timeWindow: '1 minute' } };

    app.get('/ai/status', { preHandler: use, schema: { tags } }, async (req) =>
      c.status(tenantCtx(req)),
    );
    app.get('/ai/insights', { preHandler: use, schema: { tags } }, async (req) =>
      c.insights(tenantCtx(req)),
    );
    app.get('/ai/conversations', { preHandler: use, schema: { tags } }, async (req) =>
      c.conversations(tenantCtx(req)),
    );
    app.get('/ai/conversations/:uuid', { preHandler: use, schema: { tags, params } }, async (req) =>
      c.conversation(tenantCtx(req), req.params.uuid),
    );
    app.post(
      '/ai/chat',
      { preHandler: use, config: aiLimit, schema: { tags, body: aiChatInput } },
      async (req) => c.chat(tenantCtx(req), req.body),
    );

    app.post(
      '/ai/recipe/draft',
      {
        preHandler: requirePermission('ai.use', 'products.write'),
        config: aiLimit,
        schema: { tags, body: aiRecipeDraftInput },
      },
      async (req, reply) =>
        reply.status(201).send(await c.draftRecipe(tenantCtx(req), req.body.text)),
    );

    app.post(
      '/ai/invoice/analyze',
      {
        preHandler: requirePermission('ai.use', 'purchases.write'),
        config: aiLimit,
        schema: { tags },
      },
      async (req, reply) => {
        const part = await req.file();
        if (!part)
          throw new AppError(400, 'FILE_REQUIRED', 'Adjunte la foto o el PDF de la factura.');
        let buffer: Buffer;
        try {
          buffer = await part.toBuffer();
        } catch {
          throw new AppError(413, 'FILE_TOO_LARGE', 'El archivo es demasiado grande.');
        }
        if (part.file.truncated)
          throw new AppError(413, 'FILE_TOO_LARGE', 'El archivo es demasiado grande.');
        return reply
          .status(201)
          .send(
            await c.analyzeInvoice(tenantCtx(req), {
              buffer,
              filename: part.filename.slice(0, 200),
            }),
          );
      },
    );

    app.get('/ai/drafts/:uuid', { preHandler: use, schema: { tags, params } }, async (req) =>
      c.getDraft(tenantCtx(req), req.params.uuid),
    );
    app.post(
      '/ai/drafts/:uuid/confirm-purchase',
      { preHandler: confirm('purchases.write'), schema: { tags, params, body: purchaseInput } },
      async (req, reply) =>
        reply.status(201).send(await c.confirmPurchase(tenantCtx(req), req.params.uuid, req.body)),
    );
    app.post(
      '/ai/drafts/:uuid/confirm-recipe',
      { preHandler: confirm('products.write'), schema: { tags, params, body: productInput } },
      async (req, reply) =>
        reply.status(201).send(await c.confirmRecipe(tenantCtx(req), req.params.uuid, req.body)),
    );
    app.post(
      '/ai/drafts/:uuid/confirm-scenario',
      { preHandler: confirm('scenarios.write'), schema: { tags, params, body: scenarioInput } },
      async (req, reply) =>
        reply.status(201).send(await c.confirmScenario(tenantCtx(req), req.params.uuid, req.body)),
    );
    app.post(
      '/ai/drafts/:uuid/discard',
      { preHandler: use, schema: { tags, params } },
      async (req) => c.discard(tenantCtx(req), req.params.uuid),
    );

    app.get(
      '/ai/documents/:uuid',
      { preHandler: requirePermission('purchases.read'), schema: { tags, params } },
      async (req, reply) => {
        const doc = await c.document(tenantCtx(req), req.params.uuid);
        return reply
          .header('content-type', doc.mime)
          .header(
            'content-disposition',
            `inline; filename="${doc.name.replace(/[^\w.\- ]/g, '_')}"`,
          )
          .header('x-content-type-options', 'nosniff')
          .send(doc.body);
      },
    );
  };
}
