import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Decimal, canConvert, type CustomConversion } from '@aimargen/calculation-engine';
import { parseLocaleDecimal } from '@aimargen/types';
import type { ProductInput, PurchaseInput, ScenarioInput } from '@aimargen/schemas';
import { AppError } from '../../core/http/app-error.js';
import { DbError } from '../../core/db/db-error.js';
import { bool, dec, iso, json } from '../../core/http/dto.js';
import type { Row } from '../../core/db/db.js';
import type { TenantContext } from '../../core/http/request-context.js';
import type { Services } from '../../core/services.js';
import { sniffMime } from '../../core/storage/storage.js';
import type { ProductController } from '../products/products.controller.js';
import type { IngredientController } from '../ingredients/ingredients.controller.js';
import type { PurchaseController } from '../purchases/purchases.controller.js';
import type { PlanningController } from '../planning/planning.controller.js';
import type { DashboardController } from '../dashboard/dashboard.controller.js';
import type { PricingController } from '../pricing/pricing.controller.js';
import type { SupplierController } from '../suppliers/suppliers.controller.js';
import type { TenantModel } from '../tenant/tenant.model.js';
import type { AiModel } from './ai.model.js';
import {
  AiProviderError,
  type AiContent,
  type AiMessage,
  type AiProvider,
  type AiResponse,
} from './provider.js';
import { findTool, toolSpecs, type ToolDeps } from './ai.tools.js';
import { INVOICE_SYSTEM_PROMPT, RECIPE_SYSTEM_PROMPT, chatSystemPrompt } from './prompts.js';
import { bestMatch, normalizeUnit } from './matching.js';

const MAX_ROUNDS = 6;
const HISTORY = 16;
const TOOL_OUTPUT_LIMIT = 12_000;

/** Esquemas de salida estructurada (la salida del modelo SIEMPRE se valida, SOP §39). */
const num = z.union([z.string(), z.number()]).transform((v) => String(v).replace(/[^\d.,-]/g, ''));
const invoiceOutput = z.object({
  supplier_name: z.string().max(160).optional(),
  invoice_number: z.string().max(60).optional(),
  date: z.string().max(20).optional(),
  currency: z.string().max(5).optional(),
  total: num.optional(),
  lines: z
    .array(
      z.object({
        description: z.string().max(200),
        quantity: num,
        unit: z.string().max(30).optional(),
        line_total: num,
      }),
    )
    .max(100),
  warnings: z.array(z.string().max(300)).max(20).optional(),
});
const recipeOutput = z.object({
  name: z.string().min(1).max(120),
  portions: num.optional(),
  lines: z
    .array(
      z.object({
        ingredient_name: z.string().min(1).max(120),
        quantity: num,
        unit: z.string().max(30),
      }),
    )
    .max(40),
  packaging_amount: num.optional(),
});

const INVOICE_TOOL = {
  name: 'submit_invoice',
  description: 'Entrega los datos extraídos de la factura.',
  inputSchema: {
    type: 'object',
    properties: {
      supplier_name: { type: 'string' },
      invoice_number: { type: 'string' },
      date: { type: 'string', description: 'YYYY-MM-DD' },
      currency: { type: 'string' },
      total: { type: 'string' },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: { type: 'string' },
            unit: { type: 'string' },
            line_total: { type: 'string' },
          },
          required: ['description', 'quantity', 'line_total'],
        },
      },
      warnings: { type: 'array', items: { type: 'string' } },
    },
    required: ['lines'],
  },
};
const RECIPE_TOOL = {
  name: 'submit_recipe',
  description: 'Entrega la receta estructurada.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      portions: { type: 'string' },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ingredient_name: { type: 'string' },
            quantity: { type: 'string' },
            unit: { type: 'string' },
          },
          required: ['ingredient_name', 'quantity', 'unit'],
        },
      },
      packaging_amount: { type: 'string' },
    },
    required: ['name', 'lines'],
  },
};

function toDecimalString(v: string | undefined | null): string | null {
  if (v === undefined || v === null || v === '') return null;
  return parseLocaleDecimal(v);
}

/**
 * Verificación de cifras: cada monto (₡) y porcentaje de la respuesta debe aparecer en las salidas
 * de herramientas. Las que no aparecen se devuelven para que la interfaz las marque (SOP §43, Etapa 14).
 */
export function unverifiedFigures(reply: string, toolOutputs: string[]): string[] {
  const known = new Set<string>();
  const add = (s: string) => {
    try {
      const d = new Decimal(s);
      known.add(d.toDecimalPlaces(2).toFixed(2));
      known.add(d.times(100).toDecimalPlaces(1).toFixed(1));
      known.add(d.toDecimalPlaces(0).toFixed(0));
    } catch {
      /* ignorar */
    }
  };
  for (const out of toolOutputs) for (const m of out.matchAll(/-?\d+(?:\.\d+)?/g)) add(m[0]);
  const issues: string[] = [];
  for (const m of reply.matchAll(/₡\s?-?[\d.]+(?:,\d+)?/g)) {
    const v = parseLocaleDecimal(m[0].replace('₡', '').trim());
    if (
      v &&
      !known.has(new Decimal(v).toDecimalPlaces(2).toFixed(2)) &&
      !known.has(new Decimal(v).toDecimalPlaces(0).toFixed(0))
    ) {
      issues.push(m[0].trim());
    }
  }
  for (const m of reply.matchAll(/(-?\d+(?:,\d+)?)\s?%/g)) {
    const v = parseLocaleDecimal(m[1]!);
    if (
      v &&
      !known.has(new Decimal(v).toDecimalPlaces(1).toFixed(1)) &&
      !known.has(new Decimal(v).toDecimalPlaces(0).toFixed(0))
    ) {
      issues.push(m[0].trim());
    }
  }
  return [...new Set(issues)];
}

export function createAiController(
  model: AiModel,
  deps: {
    products: ProductController;
    ingredients: IngredientController;
    purchases: PurchaseController;
    planning: PlanningController;
    dashboard: DashboardController;
    pricing: PricingController;
    suppliers: SupplierController;
    tenants: TenantModel;
  },
  s: Services,
) {
  function provider(): AiProvider {
    if (!s.ai) {
      throw new AppError(
        503,
        'AI_NOT_CONFIGURED',
        'La IA no está configurada en este servidor. El resto de AImargen funciona normalmente.',
      );
    }
    return s.ai;
  }

  async function ensureAllowed(ctx: TenantContext, flag: string): Promise<void> {
    const flags = await model.flags(ctx.tenantId);
    const enabled = flags.find((f) => f.code === flag);
    if (enabled && !bool(enabled.enabled)) {
      throw new AppError(
        403,
        'FEATURE_DISABLED',
        'Esta función de IA no está habilitada para su negocio.',
      );
    }
    const limit = s.config.AI_MONTHLY_LIMIT;
    if (limit > 0) {
      const used = (await model.usageMonth(ctx.tenantId)).reduce((a, r) => a + Number(r.calls), 0);
      if (used >= limit) {
        throw new AppError(
          429,
          'AI_LIMIT',
          'Su negocio alcanzó el límite mensual de consultas de IA.',
        );
      }
    }
  }

  async function complete(
    ctx: TenantContext,
    feature: string,
    req: Parameters<AiProvider['complete']>[0],
  ): Promise<AiResponse> {
    let res: AiResponse;
    try {
      res = await provider().complete(req);
    } catch (e) {
      if (e instanceof AiProviderError) {
        s.log.error({ err: e }, 'error del proveedor de IA');
        throw new AppError(
          502,
          'AI_UNAVAILABLE',
          'El asistente de IA no respondió. Intente de nuevo en unos minutos.',
        );
      }
      throw e;
    }
    const cost = new Decimal(res.usage.inputTokens)
      .times(s.config.AI_COST_INPUT_PER_MTOK)
      .plus(new Decimal(res.usage.outputTokens).times(s.config.AI_COST_OUTPUT_PER_MTOK))
      .dividedBy(1_000_000)
      .toFixed(6);
    await model.logUsage(
      ctx.tenantId,
      ctx.userId,
      feature,
      res.provider,
      res.model,
      res.usage.inputTokens,
      res.usage.outputTokens,
      cost,
    );
    return res;
  }

  async function currency(ctx: TenantContext) {
    const t = await deps.tenants.get(ctx.tenantId);
    return { currency: String(t?.currency ?? 'CRC'), scale: Number(t?.rounding_scale ?? 2) };
  }

  async function activeIngredients(ctx: TenantContext) {
    return (await deps.ingredients.list(ctx, { filter: 'active', page: 1, pageSize: 5000 })).items;
  }

  // ------------------------------------------------------------------ Borradores
  async function buildRecipeDraft(ctx: TenantContext, r: z.infer<typeof recipeOutput>) {
    const ingredients = await activeIngredients(ctx);
    const items = r.lines.map((l) => {
      const unit = normalizeUnit(l.unit);
      const match = bestMatch(l.ingredient_name, ingredients);
      const quantity = toDecimalString(l.quantity);
      return {
        text: l.ingredient_name,
        quantity,
        unit,
        rawUnit: l.unit,
        match: match
          ? {
              ingredientUuid: match.uuid,
              name: match.name,
              unit: match.unit,
              unitCost: match.unitCost,
              score: match.score,
            }
          : null,
        unitCompatible: !!(
          match &&
          unit &&
          canConvert(unit, match.unit, match.conversions as CustomConversion[])
        ),
      };
    });
    const packaging = toDecimalString(r.packaging_amount);
    return {
      name: r.name,
      portions: toDecimalString(r.portions) ?? '1',
      packaging: packaging ? { mode: 'fixed', value: packaging } : null,
      items,
      missing: items.filter((i) => !i.match).map((i) => i.text),
      missingCost: items
        .filter((i) => i.match && i.match.unitCost === null)
        .map((i) => i.match!.name),
    };
  }

  async function createDraft(
    ctx: TenantContext,
    kind: 'recipe' | 'scenario' | 'purchase',
    payload: unknown,
    documentUuid: string | null = null,
  ) {
    const row = await model.createDraft(ctx.tenantId, ctx.userId, kind, payload, documentUuid);
    await s.audit.log(ctx, {
      action: 'ai.draft_created',
      entity: 'ai_draft',
      entityUuid: String(row.uuid),
      after: { kind },
    });
    return { uuid: String(row.uuid), kind, payload, expiresAt: iso(row.expires_at) };
  }

  const toolDeps: ToolDeps = {
    products: deps.products,
    ingredients: deps.ingredients,
    purchases: deps.purchases,
    planning: deps.planning,
    dashboard: deps.dashboard,
    currency,
    supplierPrices: async (ctx, ingredientUuid) =>
      (await model.supplierPrices(ctx.tenantId, ingredientUuid, 180)).slice(0, 60).map((r) => ({
        ingredient: r.ingredient_name,
        unit: r.unit,
        supplier: r.supplier_name,
        unit_cost: dec(r.unit_cost),
        date: iso(r.effective_at),
      })),
    createDraft: async (ctx, kind, input) => {
      if (kind === 'recipe') {
        const parsed = recipeOutput.parse(input);
        const draft = await createDraft(ctx, 'recipe', await buildRecipeDraft(ctx, parsed));
        return {
          draft_uuid: draft.uuid,
          status: 'borrador pendiente de confirmación',
          summary: draft.payload,
        };
      }
      const i = input as {
        name: string;
        price: string;
        units_per_day: string;
        days_per_month: number;
        product_uuid?: string;
        variable_unit_cost?: string;
        fixed_costs?: string;
      };
      const scenario = {
        name: i.name,
        productUuid: i.product_uuid ?? null,
        price: i.price,
        unitsPerDay: i.units_per_day,
        daysPerMonth: i.days_per_month,
        fixedCosts: i.fixed_costs ?? null,
        variableUnitCost: i.variable_unit_cost ?? '0',
        variableSource: i.product_uuid ? ('product' as const) : ('manual' as const),
        notes: 'Creado con AImargen AI',
      };
      const result = await deps.planning.calculate(ctx, scenario);
      const draft = await createDraft(ctx, 'scenario', { ...scenario, result });
      return { draft_uuid: draft.uuid, status: 'borrador pendiente de confirmación', result };
    },
  };

  async function draftDto(ctx: TenantContext, uuid: string) {
    const d = await model.getDraft(ctx.tenantId, uuid);
    if (!d) throw new AppError(404, 'NOT_FOUND', 'No se encontró el borrador.');
    return {
      uuid: String(d.uuid),
      kind: String(d.kind) as 'recipe' | 'purchase' | 'scenario',
      status: String(d.status),
      payload: json<Record<string, unknown>>(d.payload, {}),
      documentUuid: d.document_uuid ?? null,
      resultUuid: d.result_uuid ?? null,
      expiresAt: iso(d.expires_at),
      expired: bool(d.is_expired),
      createdAt: iso(d.created_at),
      ownerUuid: String(d.user_uuid),
    };
  }

  async function pendingDraft(ctx: TenantContext, uuid: string, kind: string) {
    const d = await draftDto(ctx, uuid);
    if (d.kind !== kind) throw new AppError(400, 'WRONG_DRAFT', 'Este borrador es de otro tipo.');
    if (d.status !== 'pending')
      throw new AppError(409, 'DRAFT_DONE', 'Este borrador ya fue confirmado o descartado.');
    if (d.expired)
      throw new AppError(410, 'DRAFT_EXPIRED', 'El borrador venció. Genérelo de nuevo.');
    return d;
  }

  async function finishDraft(
    ctx: TenantContext,
    uuid: string,
    resultUuid: string,
    finalPayload: unknown,
    kind: string,
  ) {
    try {
      await model.setDraftStatus(ctx.tenantId, uuid, 'confirmed', resultUuid, finalPayload);
    } catch (e) {
      if (e instanceof DbError && e.code === 'ERR_CONFLICT') {
        throw new AppError(409, 'DRAFT_DONE', 'Este borrador ya fue confirmado o descartado.');
      }
      throw e;
    }
    await s.audit.log(ctx, {
      action: `ai.${kind}_confirmed`,
      entity: 'ai_draft',
      entityUuid: uuid,
      after: { resultUuid, payload: finalPayload },
    });
  }

  return {
    async status(ctx: TenantContext) {
      const usage = await model.usageMonth(ctx.tenantId);
      return {
        enabled: !!s.ai,
        provider: s.ai?.name ?? null,
        model: s.ai?.model ?? null,
        monthlyLimit: s.config.AI_MONTHLY_LIMIT,
        usedThisMonth: usage.reduce((a, r) => a + Number(r.calls), 0),
      };
    },

    async conversations(ctx: TenantContext) {
      return (await model.listConversations(ctx.tenantId, ctx.userId, 30)).map((c) => ({
        uuid: String(c.uuid),
        title: c.title ?? 'Conversación',
        updatedAt: iso(c.updated_at),
      }));
    },

    async conversation(ctx: TenantContext, uuid: string) {
      const conv = await model.getConversation(ctx.tenantId, ctx.userId, uuid);
      if (!conv) throw new AppError(404, 'NOT_FOUND', 'No se encontró la conversación.');
      const msgs = await model.messages(ctx.tenantId, Number(conv.id), 100);
      return {
        uuid,
        title: conv.title ?? 'Conversación',
        messages: msgs.map((m) => {
          const content = json<{ text?: string; drafts?: unknown[]; unverified?: string[] }>(
            m.content,
            {},
          );
          return {
            role: String(m.role),
            text: content.text ?? '',
            drafts: content.drafts ?? [],
            unverified: content.unverified ?? [],
            createdAt: iso(m.created_at),
          };
        }),
      };
    },

    /** Preguntar a su negocio (SOP §22). Bucle de tool calling acotado y auditado. */
    async chat(ctx: TenantContext, input: { conversationUuid: string | null; message: string }) {
      provider();
      await ensureAllowed(ctx, 'ai.chat');
      const tenant = await deps.tenants.get(ctx.tenantId);
      let conv: Row | null = null;
      if (input.conversationUuid) {
        conv = await model.getConversation(ctx.tenantId, ctx.userId, input.conversationUuid);
        if (!conv) throw new AppError(404, 'NOT_FOUND', 'No se encontró la conversación.');
      } else {
        conv = await model.createConversation(ctx.tenantId, ctx.userId, input.message.slice(0, 80));
      }
      const conversationId = Number(conv!.id);
      const history = await model.messages(ctx.tenantId, conversationId, HISTORY);
      const messages: AiMessage[] = history
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          text: json<{ text?: string }>(m.content, {}).text ?? '',
        }))
        .filter((m) => m.text)
        .map((m) => ({ role: m.role, content: [{ type: 'text' as const, text: m.text }] }));
      messages.push({ role: 'user', content: [{ type: 'text', text: input.message }] });
      await model.addMessage(ctx.tenantId, conversationId, 'user', { text: input.message });

      const canWrite =
        ctx.permissions.has('products.write') || ctx.permissions.has('scenarios.write');
      const system = chatSystemPrompt({
        businessName: String(tenant?.name ?? 'su negocio'),
        currency: String(tenant?.currency ?? 'CRC'),
        today: new Date().toISOString().slice(0, 10),
        canWrite,
      });
      const tools = toolSpecs(ctx.permissions);
      const toolCalls: Array<{ name: string; status: 'ok' | 'error' | 'denied' }> = [];
      const toolOutputs: string[] = [];
      const drafts: unknown[] = [];
      let reply = '';

      for (let round = 0; round < MAX_ROUNDS; round++) {
        const res = await complete(ctx, 'chat', { system, messages, tools, maxTokens: 1500 });
        const text = res.content
          .filter((c): c is Extract<AiContent, { type: 'text' }> => c.type === 'text')
          .map((c) => c.text)
          .join('\n')
          .trim();
        const uses = res.content.filter(
          (c): c is Extract<AiContent, { type: 'tool_use' }> => c.type === 'tool_use',
        );
        if (res.stopReason !== 'tool_use' || uses.length === 0) {
          reply = text;
          break;
        }
        messages.push({ role: 'assistant', content: res.content });
        const results: AiContent[] = [];
        for (const use of uses) {
          const started = Date.now();
          const def = findTool(use.name);
          let status: 'ok' | 'error' | 'denied' = 'ok';
          let output: unknown;
          if (!def) {
            status = 'error';
            output = { error: 'Herramienta desconocida.' };
          } else if (!ctx.permissions.has(def.permission)) {
            status = 'denied';
            output = { error: 'La persona no tiene permiso para esta consulta.' };
          } else {
            const parsed = def.schema.safeParse(use.input);
            if (!parsed.success) {
              status = 'error';
              output = {
                error: 'Parámetros inválidos para la herramienta.',
                detail: parsed.error.issues.map((i) => i.message).slice(0, 3),
              };
            } else {
              try {
                output = await def.run(ctx, parsed.data as never, toolDeps);
                if (def.writes && output && typeof output === 'object' && 'draft_uuid' in output) {
                  drafts.push(
                    await draftDto(ctx, String((output as { draft_uuid: string }).draft_uuid)),
                  );
                }
              } catch (e) {
                status = 'error';
                output = {
                  error: e instanceof AppError ? e.message : 'No se pudo consultar este dato.',
                };
                if (!(e instanceof AppError))
                  s.log.error({ err: e, tool: use.name }, 'error en herramienta de IA');
              }
            }
          }
          const serialized = JSON.stringify(output).slice(0, TOOL_OUTPUT_LIMIT);
          toolOutputs.push(serialized);
          toolCalls.push({ name: use.name, status });
          await model.logToolCall(
            ctx.tenantId,
            conversationId,
            ctx.userId,
            use.name,
            use.input,
            output,
            status,
            Date.now() - started,
          );
          results.push({
            type: 'tool_result',
            toolUseId: use.id,
            content: serialized,
            isError: status !== 'ok',
          });
        }
        messages.push({ role: 'user', content: results });
      }

      if (!reply) {
        reply =
          'No pude completar la consulta con los datos disponibles. Intente con una pregunta más específica.';
      }
      const unverified = unverifiedFigures(reply, toolOutputs);
      await model.addMessage(ctx.tenantId, conversationId, 'assistant', {
        text: reply,
        drafts,
        unverified,
        tools: toolCalls,
      });
      return { conversationUuid: String(conv!.uuid), reply, toolCalls, drafts, unverified };
    },

    /** Captura inteligente de facturas (SOP §23): extrae, empareja y crea un borrador. Nunca guarda la compra. */
    async analyzeInvoice(ctx: TenantContext, file: { buffer: Buffer; filename: string }) {
      provider();
      await ensureAllowed(ctx, 'ai.invoice_capture');
      const mime = sniffMime(file.buffer);
      if (!mime)
        throw new AppError(
          415,
          'UNSUPPORTED_FILE',
          'Suba una foto (JPG, PNG o WEBP) o un PDF de la factura.',
        );
      const sha = createHash('sha256').update(file.buffer).digest('hex');
      const ext = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
      }[mime];
      const key = `${ctx.tenantUuid}/invoices/${randomUUID()}.${ext}`;
      await s.storage.put(key, file.buffer, mime);
      const documentUuid = await model.createDocument(
        ctx.tenantId,
        ctx.userId,
        key,
        file.filename,
        mime,
        file.buffer.length,
        sha,
      );

      const content: AiContent =
        mime === 'application/pdf'
          ? { type: 'document', mediaType: 'application/pdf', data: file.buffer.toString('base64') }
          : { type: 'image', mediaType: mime, data: file.buffer.toString('base64') };
      const res = await complete(ctx, 'invoice', {
        system: INVOICE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [content, { type: 'text', text: 'Extraiga los datos de esta factura.' }],
          },
        ],
        tools: [INVOICE_TOOL],
        toolChoice: { type: 'tool', name: 'submit_invoice' },
        maxTokens: 3000,
      });
      const use = res.content.find((c) => c.type === 'tool_use');
      const parsed = invoiceOutput.safeParse(use && use.type === 'tool_use' ? use.input : null);
      if (!parsed.success) {
        throw new AppError(
          422,
          'INVOICE_UNREADABLE',
          'No se pudo leer la factura. Intente con una foto más clara o registre la compra manualmente.',
        );
      }
      const inv = parsed.data;
      const [ingredients, suppliers] = await Promise.all([
        activeIngredients(ctx),
        deps.suppliers.list(ctx, undefined, false, 1, 2000).then((r) => r.items),
      ]);
      const supplierMatch = inv.supplier_name ? bestMatch(inv.supplier_name, suppliers, 0.6) : null;
      const date = inv.date && /^\d{4}-\d{2}-\d{2}$/.test(inv.date) ? inv.date : null;
      const lines = inv.lines.map((l) => {
        const unit = normalizeUnit(l.unit);
        const match = bestMatch(l.description, ingredients);
        return {
          description: l.description,
          quantity: toDecimalString(l.quantity),
          unit,
          rawUnit: l.unit ?? null,
          lineTotal: toDecimalString(l.line_total),
          match: match
            ? { ingredientUuid: match.uuid, name: match.name, unit: match.unit, score: match.score }
            : null,
          unitCompatible: !!(
            match &&
            unit &&
            canConvert(unit, match.unit, match.conversions as CustomConversion[])
          ),
        };
      });
      const warnings = [...(inv.warnings ?? [])];
      if (!date)
        warnings.push('No se encontró la fecha de la factura: revísela antes de confirmar.');
      if (lines.some((l) => !l.match))
        warnings.push('Algunas líneas no coinciden con ingredientes registrados.');
      const payload = {
        documentUuid,
        supplier: {
          name: inv.supplier_name ?? null,
          match: supplierMatch
            ? { uuid: supplierMatch.uuid, name: supplierMatch.name, score: supplierMatch.score }
            : null,
        },
        date,
        reference: inv.invoice_number ?? null,
        currency: inv.currency ?? null,
        total: toDecimalString(inv.total),
        lines,
        warnings,
      };
      return createDraft(ctx, 'purchase', payload, documentUuid);
    },

    /** Creación de recetas por lenguaje natural (SOP §24). Devuelve un borrador; nunca inventa costos. */
    async draftRecipe(ctx: TenantContext, text: string) {
      provider();
      await ensureAllowed(ctx, 'ai.recipe_draft');
      const res = await complete(ctx, 'recipe', {
        system: RECIPE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: [{ type: 'text', text }] }],
        tools: [RECIPE_TOOL],
        toolChoice: { type: 'tool', name: 'submit_recipe' },
        maxTokens: 1500,
      });
      const use = res.content.find((c) => c.type === 'tool_use');
      const parsed = recipeOutput.safeParse(use && use.type === 'tool_use' ? use.input : null);
      if (!parsed.success) {
        throw new AppError(
          422,
          'RECIPE_UNREADABLE',
          'No se pudo interpretar la receta. Escriba ingredientes con cantidad y unidad.',
        );
      }
      return createDraft(ctx, 'recipe', await buildRecipeDraft(ctx, parsed.data));
    },

    getDraft: draftDto,

    async confirmPurchase(ctx: TenantContext, uuid: string, input: PurchaseInput) {
      const d = await pendingDraft(ctx, uuid, 'purchase');
      const purchase = await deps.purchases.create(ctx, input, {
        source: 'invoice_ai',
        documentUuid: d.documentUuid,
      });
      await finishDraft(ctx, uuid, purchase.uuid, input, 'purchase');
      return purchase;
    },

    async confirmRecipe(ctx: TenantContext, uuid: string, input: ProductInput) {
      await pendingDraft(ctx, uuid, 'recipe');
      const product = await deps.products.save(ctx, null, input);
      await finishDraft(ctx, uuid, product.uuid, input, 'recipe');
      return product;
    },

    async confirmScenario(ctx: TenantContext, uuid: string, input: ScenarioInput) {
      await pendingDraft(ctx, uuid, 'scenario');
      const scenario = await deps.planning.saveScenario(ctx, null, input);
      await finishDraft(ctx, uuid, scenario.uuid, input, 'scenario');
      return scenario;
    },

    async discard(ctx: TenantContext, uuid: string) {
      const d = await draftDto(ctx, uuid);
      if (d.status !== 'pending')
        throw new AppError(409, 'DRAFT_DONE', 'Este borrador ya fue confirmado o descartado.');
      await model.setDraftStatus(ctx.tenantId, uuid, 'discarded', null, undefined);
      await s.audit.log(ctx, {
        action: 'ai.draft_discarded',
        entity: 'ai_draft',
        entityUuid: uuid,
      });
      return { ok: true };
    },

    async document(ctx: TenantContext, uuid: string) {
      const doc = await model.getDocument(ctx.tenantId, uuid);
      if (!doc) throw new AppError(404, 'NOT_FOUND', 'No se encontró el documento.');
      return {
        body: await s.storage.get(String(doc.storage_key)),
        mime: String(doc.mime_type),
        name: String(doc.original_name ?? 'factura'),
      };
    },

    /** Insights (SOP §25): deterministas y rastreables; disponibles aunque la IA no esté configurada. */
    async insights(ctx: TenantContext) {
      const flag = (await model.flags(ctx.tenantId)).find((f) => f.code === 'ai.insights');
      if (flag && !bool(flag.enabled)) {
        throw new AppError(403, 'FEATURE_DISABLED', 'Esta función no está habilitada para su negocio.');
      }
      const summary = await deps.dashboard.summary(ctx);
      return { insights: summary.insights, alerts: summary.alerts, aiEnabled: !!s.ai };
    },
  };
}

export type AiController = ReturnType<typeof createAiController>;
