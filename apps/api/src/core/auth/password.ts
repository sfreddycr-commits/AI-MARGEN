import { hash, verify } from '@node-rs/argon2';

/**
 * Contraseñas con Argon2id (ADR-0008, SOP §29). Parámetros OWASP: m=19 MiB, t=2, p=1.
 */
// algorithm 2 = Argon2id (enum constante de @node-rs/argon2, no importable con verbatimModuleSyntax)
const OPTIONS = { algorithm: 2 as const, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}

/** Hash ficticio para igualar tiempos cuando el usuario no existe (evita enumeración por tiempo). */
let dummyHash: Promise<string> | null = null;
export async function verifyDummy(plain: string): Promise<void> {
  dummyHash ??= hashPassword('aimargen-dummy-password-1');
  await verifyPassword(await dummyHash, plain);
}
