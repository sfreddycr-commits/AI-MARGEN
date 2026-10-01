import type { Db, Row } from '../../core/db/db.js';

/** Modelo de IA: conversaciones, mensajes, tool calls, consumo, borradores y documentos. Solo SPs. */
export function createAiModel(db: Db) {
  return {
    createConversation: async (t: number, userId: number, title: string) =>
      (await db.callOne<Row>('sp_ai_conversation_create', [t, userId, title]))[0]!,
    getConversation: async (t: number, userId: number, uuid: string) =>
      (await db.callOne<Row>('sp_ai_conversation_get', [t, userId, uuid]))[0] ?? null,
    listConversations: (t: number, userId: number, limit: number) =>
      db.callOne<Row>('sp_ai_conversation_list', [t, userId, limit]),
    addMessage: (t: number, conversationId: number, role: 'user' | 'assistant', content: unknown) =>
      db.call('sp_ai_message_add', [t, conversationId, role, JSON.stringify(content)]),
    messages: (t: number, conversationId: number, limit: number) =>
      db.callOne<Row>('sp_ai_message_list', [t, conversationId, limit]),
    logToolCall: (
      t: number,
      conversationId: number | null,
      userId: number,
      tool: string,
      input: unknown,
      output: unknown,
      status: 'ok' | 'error' | 'denied',
      ms: number,
    ) =>
      db.call('sp_ai_tool_call_log', [
        t,
        conversationId,
        userId,
        tool,
        JSON.stringify(input ?? null),
        JSON.stringify(output ?? null),
        status,
        ms,
      ]),
    logUsage: (
      t: number,
      userId: number,
      feature: string,
      provider: string,
      model: string,
      inTok: number,
      outTok: number,
      cost: string,
    ) => db.call('sp_ai_usage_log', [t, userId, feature, provider, model, inTok, outTok, cost]),
    usageMonth: (t: number) => db.callOne<Row>('sp_ai_usage_month', [t]),
    createDraft: async (
      t: number,
      userId: number,
      kind: string,
      payload: unknown,
      documentUuid: string | null,
    ) =>
      (
        await db.callOne<Row>('sp_ai_draft_create', [
          t,
          userId,
          kind,
          JSON.stringify(payload),
          documentUuid,
          72,
        ])
      )[0]!,
    getDraft: async (t: number, uuid: string) =>
      (await db.callOne<Row>('sp_ai_draft_get', [t, uuid]))[0] ?? null,
    setDraftStatus: (
      t: number,
      uuid: string,
      status: 'confirmed' | 'discarded',
      resultUuid: string | null,
      payload: unknown,
    ) =>
      db.call('sp_ai_draft_set_status', [
        t,
        uuid,
        status,
        resultUuid,
        payload === undefined ? null : JSON.stringify(payload),
      ]),
    createDocument: async (
      t: number,
      userId: number,
      key: string,
      name: string,
      mime: string,
      size: number,
      sha: string,
    ) =>
      String(
        (
          await db.callOne<Row>('sp_document_create', [
            t,
            userId,
            'invoice',
            key,
            name,
            mime,
            size,
            sha,
          ])
        )[0]!.uuid,
      ),
    getDocument: async (t: number, uuid: string) =>
      (await db.callOne<Row>('sp_document_get', [t, uuid]))[0] ?? null,
    flags: (t: number) => db.callOne<Row>('sp_tenant_flags', [t]),
    supplierPrices: (t: number, ingredientUuid: string | null, days: number) =>
      db.callOne<Row>('sp_report_supplier_prices', [t, ingredientUuid, days]),
  };
}

export type AiModel = ReturnType<typeof createAiModel>;
