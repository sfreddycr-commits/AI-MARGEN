/**
 * Preferencias pequeñas del dispositivo en localStorage (ADR-0007).
 * Nunca guardar aquí tokens ni datos del negocio. Si el almacenamiento no está disponible
 * (modo privado, cuota llena), las preferencias simplemente no persisten.
 */
const PREFIX = 'aimargen:pref:';

export type PrefKey = 'lastModule' | 'listView';

export function getPref(key: PrefKey): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function setPref(key: PrefKey, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Sin almacenamiento: se ignora.
  }
}
