import type { Db } from '../db/db.js';
import type { RequestContext } from '../http/request-context.js';

/**
 * Servicio de auditoría (SOP §35). Única vía de escritura: sp_audit_log_create.
 * Los controladores lo usan en cambios de precio, compras, recetas, roles, settings,
 * acciones de IA confirmadas y acciones administrativas.
 */
export interface AuditEntry {
  action: string;
  entity?: string | null;
  entityUuid?: string | null;
  before?: unknown;
  after?: unknown;
}

/** Claves que nunca se guardan en auditoría. */
const SENSITIVE = /password|token|secret|hash|api_?key/i;

export function redactForAudit(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactForAudit);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SENSITIVE.test(k) ? '[REDACTADO]' : redactForAudit(v),
      ]),
    );
  }
  return value;
}

const toJson = (v: unknown) =>
  v === undefined || v === null ? null : JSON.stringify(redactForAudit(v));

export function createAuditService(db: Db) {
  return {
    async log(ctx: RequestContext, entry: AuditEntry): Promise<void> {
      await db.call('sp_audit_log_create', [
        ctx.tenantId,
        ctx.userId,
        entry.action,
        entry.entity ?? null,
        entry.entityUuid ?? null,
        toJson(entry.before),
        toJson(entry.after),
        ctx.ip,
        ctx.userAgent,
        ctx.requestId,
      ]);
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
