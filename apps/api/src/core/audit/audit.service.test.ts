import { describe, expect, it } from 'vitest';
import { redactForAudit } from './audit.service.js';

describe('redactForAudit', () => {
  it('oculta contraseñas, tokens y hashes en cualquier nivel', () => {
    expect(
      redactForAudit({
        name: 'Ana',
        password: 'x',
        nested: { refreshToken: 'y', items: [{ api_key: 'z', qty: 2 }] },
        password_hash: 'h',
      }),
    ).toEqual({
      name: 'Ana',
      password: '[REDACTADO]',
      nested: { refreshToken: '[REDACTADO]', items: [{ api_key: '[REDACTADO]', qty: 2 }] },
      password_hash: '[REDACTADO]',
    });
  });

  it('deja intactos valores primitivos', () => {
    expect(redactForAudit('0.40')).toBe('0.40');
    expect(redactForAudit(null)).toBeNull();
  });
});
