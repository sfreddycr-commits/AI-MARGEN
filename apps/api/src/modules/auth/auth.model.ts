import type { Db, Row } from '../../core/db/db.js';

/** Modelo de autenticación: solo llamadas a SPs. */
export function createAuthModel(db: Db) {
  return {
    async createUser(
      name: string,
      email: string,
      passwordHash: string,
    ): Promise<{ id: number; uuid: string }> {
      const [row] = await db.callOne<Row>('sp_auth_user_create', [name, email, passwordHash]);
      return { id: Number(row!.id), uuid: String(row!.uuid) };
    },
    async getByEmail(email: string): Promise<Row | null> {
      return (await db.callOne<Row>('sp_auth_user_get_by_email', [email]))[0] ?? null;
    },
    async getUser(userId: number): Promise<Row | null> {
      return (await db.callOne<Row>('sp_auth_user_get', [userId]))[0] ?? null;
    },
    async loginFailed(userId: number, maxAttempts: number, lockMinutes: number): Promise<void> {
      await db.call('sp_auth_login_failed', [userId, maxAttempts, lockMinutes]);
    },
    async loginSucceeded(userId: number): Promise<void> {
      await db.call('sp_auth_login_succeeded', [userId]);
    },
    async createToken(
      userId: number,
      purpose: string,
      tokenHash: string,
      ttlMinutes: number,
    ): Promise<void> {
      await db.call('sp_auth_token_create', [userId, purpose, tokenHash, ttlMinutes]);
    },
    async consumeToken(tokenHash: string, purpose: string): Promise<Row> {
      const [row] = await db.callOne<Row>('sp_auth_token_consume', [tokenHash, purpose]);
      return row!;
    },
    async verifyEmail(userId: number): Promise<void> {
      await db.call('sp_auth_email_verify', [userId]);
    },
    async setPassword(userId: number, passwordHash: string): Promise<void> {
      await db.call('sp_auth_password_set', [userId, passwordHash]);
    },
    async createSession(p: {
      userId: number;
      family: string;
      tokenHash: string;
      remember: boolean;
      ttlDays: number;
      ip: string;
      userAgent: string | null;
    }): Promise<void> {
      await db.call('sp_session_create', [
        p.userId,
        p.family,
        p.tokenHash,
        p.remember ? 1 : 0,
        p.ttlDays,
        p.ip,
        p.userAgent,
      ]);
    },
    async rotateSession(
      oldHash: string,
      newHash: string,
      ttlDays: number,
      ip: string,
      userAgent: string | null,
    ): Promise<Row> {
      const [row] = await db.callOne<Row>('sp_session_rotate', [
        oldHash,
        newHash,
        ttlDays,
        ip,
        userAgent,
      ]);
      return row!;
    },
    async revokeSession(tokenHash: string): Promise<void> {
      await db.call('sp_session_revoke', [tokenHash]);
    },
    async revokeUserSessions(userId: number): Promise<void> {
      await db.call('sp_session_revoke_user', [userId]);
    },
    async createSuperAdmin(name: string, email: string, passwordHash: string): Promise<string> {
      const [row] = await db.callOne<Row>('sp_admin_super_create', [name, email, passwordHash]);
      return String(row!.uuid);
    },
  };
}

export type AuthModel = ReturnType<typeof createAuthModel>;
