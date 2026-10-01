/**
 * Traduce errores de MySQL a códigos estables.
 * Los SP señalan errores de negocio con SIGNAL SQLSTATE '45000' y MESSAGE_TEXT = 'ERR_<CODIGO>'.
 */
export type DbErrorCode =
  | 'ERR_NOT_FOUND'
  | 'ERR_CONFLICT'
  | 'ERR_DUPLICATE'
  | 'ERR_FORBIDDEN'
  | 'ERR_VALIDATION'
  | 'ERR_FK_VIOLATION'
  | 'ERR_DB';

const KNOWN = new Set<DbErrorCode>([
  'ERR_NOT_FOUND',
  'ERR_CONFLICT',
  'ERR_DUPLICATE',
  'ERR_FORBIDDEN',
  'ERR_VALIDATION',
  'ERR_FK_VIOLATION',
]);

export class DbError extends Error {
  readonly code: DbErrorCode;
  readonly sp: string;
  readonly detail?: string;

  constructor(code: DbErrorCode, sp: string, detail?: string) {
    super(`${code} en ${sp}`);
    this.name = 'DbError';
    this.code = code;
    this.sp = sp;
    this.detail = detail;
  }

  static from(err: unknown, sp: string): DbError {
    const e = err as { sqlState?: string; errno?: number; sqlMessage?: string; message?: string };
    if (e?.sqlState === '45000' && e.sqlMessage) {
      const [code, detail] = e.sqlMessage.split(':', 2) as [string, string | undefined];
      if (KNOWN.has(code as DbErrorCode)) return new DbError(code as DbErrorCode, sp, detail);
    }
    if (e?.errno === 1062) return new DbError('ERR_DUPLICATE', sp);
    if (e?.errno === 1451 || e?.errno === 1452) return new DbError('ERR_FK_VIOLATION', sp);
    return new DbError('ERR_DB', sp, e?.message);
  }
}
