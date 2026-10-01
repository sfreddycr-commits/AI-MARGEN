import type { AppConfig } from '../../core/config/config.js';

/**
 * Abstracción de proveedor de IA (ADR-0010). El resto del sistema solo conoce esta interfaz;
 * cambiar de proveedor no toca el gateway ni las herramientas.
 */
export type AiContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolUseId: string; content: string; isError?: boolean }
  | { type: 'image'; mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }
  | { type: 'document'; mediaType: 'application/pdf'; data: string };

export interface AiMessage {
  role: 'user' | 'assistant';
  content: AiContent[];
}

export interface AiToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AiRequest {
  system: string;
  messages: AiMessage[];
  tools?: AiToolSpec[];
  /** 'auto' (por defecto) o forzar una herramienta concreta (salida estructurada). */
  toolChoice?: { type: 'auto' } | { type: 'tool'; name: string };
  maxTokens?: number;
}

export interface AiResponse {
  content: AiContent[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'other';
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  provider: string;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  complete(req: AiRequest): Promise<AiResponse>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

/** Proveedor Anthropic (Messages API con tool use y visión). */
export function createAnthropicProvider(config: AppConfig): AiProvider {
  const url = `${config.AI_BASE_URL.replace(/\/$/, '')}/v1/messages`;

  function toWire(c: AiContent): Record<string, unknown> {
    switch (c.type) {
      case 'text':
        return { type: 'text', text: c.text };
      case 'tool_use':
        return { type: 'tool_use', id: c.id, name: c.name, input: c.input };
      case 'tool_result':
        return {
          type: 'tool_result',
          tool_use_id: c.toolUseId,
          content: c.content,
          is_error: c.isError ?? false,
        };
      case 'image':
        return { type: 'image', source: { type: 'base64', media_type: c.mediaType, data: c.data } };
      case 'document':
        return {
          type: 'document',
          source: { type: 'base64', media_type: c.mediaType, data: c.data },
        };
    }
  }

  return {
    name: 'anthropic',
    model: config.AI_MODEL,
    async complete(req) {
      const body = {
        model: config.AI_MODEL,
        max_tokens: req.maxTokens ?? 1500,
        system: req.system,
        messages: req.messages.map((m) => ({ role: m.role, content: m.content.map(toWire) })),
        ...(req.tools?.length
          ? {
              tools: req.tools.map((t) => ({
                name: t.name,
                description: t.description,
                input_schema: t.inputSchema,
              })),
              tool_choice: req.toolChoice ?? { type: 'auto' },
            }
          : {}),
      };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': config.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (e) {
        throw new AiProviderError(
          `No se pudo contactar al proveedor de IA: ${(e as Error).message}`,
        );
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new AiProviderError(
          `Proveedor de IA respondió ${res.status}: ${text.slice(0, 300)}`,
          res.status,
        );
      }
      const data = (await res.json()) as {
        content: Array<{
          type: string;
          text?: string;
          id?: string;
          name?: string;
          input?: Record<string, unknown>;
        }>;
        stop_reason: string;
        usage?: { input_tokens?: number; output_tokens?: number };
        model: string;
      };
      const content: AiContent[] = [];
      for (const c of data.content) {
        if (c.type === 'text' && c.text) content.push({ type: 'text', text: c.text });
        if (c.type === 'tool_use' && c.id && c.name)
          content.push({ type: 'tool_use', id: c.id, name: c.name, input: c.input ?? {} });
      }
      const stop = data.stop_reason;
      return {
        content,
        stopReason:
          stop === 'end_turn' || stop === 'tool_use' || stop === 'max_tokens' ? stop : 'other',
        usage: {
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
        },
        model: data.model ?? config.AI_MODEL,
        provider: 'anthropic',
      };
    },
  };
}

export function createAiProvider(config: AppConfig): AiProvider | null {
  if (config.AI_PROVIDER === 'anthropic' && config.ANTHROPIC_API_KEY)
    return createAnthropicProvider(config);
  return null;
}
