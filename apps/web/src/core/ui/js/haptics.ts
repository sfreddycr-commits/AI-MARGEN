/**
 * Retroalimentación háptica donde el navegador la soporte (Android/Chrome).
 * iOS Safari no expone vibración; la función simplemente no hace nada.
 */
const PATTERNS = { light: 8, medium: 16, success: [10, 40, 10], error: [30, 50, 30] } as const;

export function haptic(kind: keyof typeof PATTERNS = 'light'): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) navigator.vibrate(PATTERNS[kind] as number | number[]);
    }
  } catch {
    // Sin soporte: ignorar.
  }
}
