import { createHash, randomBytes } from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';

/** Token aleatorio de 256 bits en base64url (refresh, verificación, recuperación). */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hex. En BD solo se guardan hashes de tokens, nunca el token. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export interface AccessClaims {
  /** id interno del usuario */
  uid: number;
  uu: string;
  /** id interno del tenant (null antes del onboarding o para super_admin) */
  tid: number | null;
  tu: string | null;
  role: string;
}

export const ACCESS_TTL_SECONDS = 15 * 60;

/**
 * Token de acceso cifrado (JWE dir + A256GCM): el navegador lo guarda en cookie HttpOnly
 * y no puede leer ni alterar su contenido (los ids internos no quedan expuestos).
 */
export function createAccessTokenCodec(secret: string) {
  const key = createHash('sha256').update(secret).digest();
  return {
    async sign(claims: AccessClaims): Promise<string> {
      return new EncryptJWT({ ...claims })
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt()
        .setIssuer('aimargen')
        .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
        .encrypt(key);
    },
    async verify(token: string): Promise<AccessClaims | null> {
      try {
        const { payload } = await jwtDecrypt(token, key, { issuer: 'aimargen' });
        if (typeof payload.uid !== 'number' || typeof payload.role !== 'string') return null;
        return {
          uid: payload.uid,
          uu: String(payload.uu),
          tid: typeof payload.tid === 'number' ? payload.tid : null,
          tu: typeof payload.tu === 'string' ? payload.tu : null,
          role: payload.role,
        };
      } catch {
        return null;
      }
    },
  };
}

export type AccessTokenCodec = ReturnType<typeof createAccessTokenCodec>;
