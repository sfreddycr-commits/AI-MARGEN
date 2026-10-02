/** Textos y formatos del panel de plataforma (sin lógica de red). */

type Tone = 'positive' | 'warning' | 'danger' | 'neutral' | 'info';

export const TENANT_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Activo', tone: 'positive' },
  suspended: { label: 'Suspendido', tone: 'danger' },
};

export const USER_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Activo', tone: 'positive' },
  invited: { label: 'Invitado', tone: 'info' },
  blocked: { label: 'Bloqueado', tone: 'danger' },
};

export function statusOf(map: Record<string, { label: string; tone: Tone }>, s: string) {
  return map[s] ?? { label: s, tone: 'neutral' as const };
}

const intFmt = new Intl.NumberFormat('es-CR');
export const formatInt = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : intFmt.format(n);

export function formatBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${new Intl.NumberFormat('es-CR', { maximumFractionDigits: i === 0 ? 0 : 1 }).format(v)} ${units[i]}`;
}

const ACTION_LABELS: Record<string, string> = {
  'admin.tenant_suspend': 'Suspendió un negocio',
  'admin.tenant_activate': 'Reactivó un negocio',
  'admin.flag_set': 'Cambió una función del negocio',
  'auth.register': 'Registro de cuenta',
  'auth.login': 'Inicio de sesión',
  'auth.login_failed': 'Intento de ingreso fallido',
  'auth.logout': 'Cierre de sesión',
  'auth.password_changed': 'Cambio de contraseña',
  'auth.password_reset': 'Restablecimiento de contraseña',
  'auth.email_verified': 'Verificación de correo',
  'auth.invite_accepted': 'Invitación aceptada',
  'tenant.create': 'Creación de negocio',
  'tenant.update': 'Edición de datos del negocio',
  'tenant.onboarding_completed': 'Configuración inicial completada',
  'tenant_settings.update': 'Cambio de configuración de costeo',
  'user.invite': 'Invitación de usuario',
  'user.update': 'Cambio de rol o estado de usuario',
  'product.price_change': 'Cambio de precio',
  'purchase.void': 'Anulación de compra',
  'report.export': 'Exportación de reporte',
};

export function humanizeAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Filtros rápidos de auditoría (la API filtra por prefijo de la acción). */
export const AUDIT_PRESETS = [
  { value: '', label: 'Todo' },
  { value: 'admin.', label: 'Acciones admin' },
  { value: 'auth.', label: 'Accesos' },
  { value: 'user.', label: 'Usuarios' },
  { value: 'tenant', label: 'Negocios' },
] as const;

/** Muestra antes/después de forma legible y compacta. */
export function compactJson(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v !== 'object') return String(v);
  return Object.entries(v as Record<string, unknown>)
    .map(
      ([k, val]) =>
        `${k}: ${val !== null && typeof val === 'object' ? JSON.stringify(val) : String(val)}`,
    )
    .join(' · ');
}
