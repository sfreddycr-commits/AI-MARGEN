import type { BUSINESS_TYPES, COST_METHODS, INVITABLE_ROLES } from '@aimargen/schemas';

/** Textos y catálogos de la pantalla de Configuración (sin lógica de red). */

export const BUSINESS_TYPE_LABELS: Record<(typeof BUSINESS_TYPES)[number], string> = {
  restaurant: 'Restaurante',
  soda: 'Soda',
  cafe: 'Cafetería',
  bakery: 'Panadería',
  pastry: 'Repostería',
  food_truck: 'Food truck',
  catering: 'Catering / eventos',
  other: 'Otro',
};

export const COUNTRY_OPTIONS = [
  { value: 'CR', label: 'Costa Rica' },
  { value: 'PA', label: 'Panamá' },
  { value: 'NI', label: 'Nicaragua' },
  { value: 'HN', label: 'Honduras' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'MX', label: 'México' },
  { value: 'CO', label: 'Colombia' },
  { value: 'US', label: 'Estados Unidos' },
];

export const CURRENCY_OPTIONS = [
  { value: 'CRC', label: 'Colón costarricense (₡)' },
  { value: 'USD', label: 'Dólar estadounidense ($)' },
];

export const TIMEZONE_OPTIONS = [
  { value: 'America/Costa_Rica', label: 'Costa Rica (GMT-6)' },
  { value: 'America/Panama', label: 'Panamá (GMT-5)' },
  { value: 'America/Managua', label: 'Nicaragua (GMT-6)' },
  { value: 'America/Tegucigalpa', label: 'Honduras (GMT-6)' },
  { value: 'America/El_Salvador', label: 'El Salvador (GMT-6)' },
  { value: 'America/Guatemala', label: 'Guatemala (GMT-6)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Bogota', label: 'Colombia (GMT-5)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5/-4)' },
];

/** Agrega el valor actual a las opciones si no está en la lista corta. */
export function withCurrent(options: Array<{ value: string; label: string }>, current: string) {
  return !current || options.some((o) => o.value === current)
    ? options
    : [...options, { value: current, label: current }];
}

export const COST_METHOD_INFO: Record<
  (typeof COST_METHODS)[number],
  { label: string; description: string }
> = {
  last_purchase: {
    label: 'Precio de la última compra',
    description:
      'Cada ingrediente cuesta lo que pagó la última vez. Reacciona rápido cuando los precios suben.',
  },
  weighted_average: {
    label: 'Costo promedio',
    description:
      'Promedia lo que ha pagado según las cantidades compradas. Suaviza subidas y bajadas puntuales.',
  },
};

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

/** Qué puede hacer cada rol, en palabras simples. */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  tenant_owner: 'Dueño de la cuenta. Tiene acceso a todo.',
  tenant_admin:
    'Puede hacer todo en el negocio: datos, configuración, equipo, precios y auditoría.',
  manager:
    'Maneja la operación completa: ingredientes, compras, recetas, precios, escenarios y reportes. No administra el equipo ni la configuración.',
  operator:
    'Registra compras y mantiene ingredientes y proveedores. Puede ver recetas y precios, pero no cambiarlos.',
  viewer: 'Solo puede consultar la información. No puede cambiar nada.',
};

/** Jerarquía de roles (igual que en la API): solo se gestiona a quien está por debajo. */
export const ROLE_RANK: Record<string, number> = {
  super_admin: 100,
  tenant_owner: 50,
  tenant_admin: 40,
  manager: 30,
  operator: 20,
  viewer: 10,
};

export const USER_STATUS: Record<
  string,
  { label: string; tone: 'positive' | 'warning' | 'danger' | 'neutral' | 'info' }
> = {
  active: { label: 'Activo', tone: 'positive' },
  invited: { label: 'Invitado', tone: 'info' },
  blocked: { label: 'Bloqueado', tone: 'danger' },
};

const ENTITY_LABELS: Record<string, string> = {
  tenant: 'negocio',
  tenant_settings: 'configuración de costeo',
  user: 'usuario',
  ingredient: 'ingrediente',
  ingredient_category: 'categoría de ingredientes',
  product_category: 'categoría de productos',
  supplier: 'proveedor',
  purchase: 'compra',
  product: 'producto',
  fixed_cost: 'costo fijo',
  scenario: 'escenario',
  report: 'reporte',
};

const ACTION_LABELS: Record<string, string> = {
  'tenant.create': 'Creó el negocio',
  'tenant.onboarding_completed': 'Terminó la configuración inicial',
  'tenant.update': 'Editó los datos del negocio',
  'tenant_settings.update': 'Cambió la configuración de costeo',
  'user.invite': 'Invitó a un usuario',
  'user.update': 'Cambió el rol o estado de un usuario',
  'auth.register': 'Creó su cuenta',
  'auth.login': 'Inició sesión',
  'auth.logout': 'Cerró sesión',
  'auth.password_changed': 'Cambió su contraseña',
  'auth.password_reset': 'Restableció su contraseña',
  'auth.email_verified': 'Verificó su correo',
  'auth.invite_accepted': 'Aceptó la invitación',
  'ingredient.cost_add': 'Registró un costo de ingrediente',
  'product.duplicate': 'Duplicó un producto',
  'product.price_change': 'Cambió el precio de un producto',
  'purchase.void': 'Anuló una compra',
  'report.export': 'Exportó un reporte',
  'ai.draft_created': 'La IA preparó un borrador',
  'ai.draft_discarded': 'Descartó un borrador de la IA',
};

const VERB_LABELS: Record<string, string> = {
  create: 'Creó',
  update: 'Editó',
  archive: 'Archivó',
  restore: 'Restauró',
  delete: 'Eliminó',
  void: 'Anuló',
};

/** "supplier.archive" → "Archivó proveedor". Si no se reconoce, devuelve el código. */
export function humanizeAction(action: string): string {
  const known = ACTION_LABELS[action];
  if (known) return known;
  const [entity = '', verb = ''] = action.split('.');
  const v = VERB_LABELS[verb];
  const e = ENTITY_LABELS[entity];
  if (v && e) return `${v} ${e}`;
  if (entity === 'ai' && verb.endsWith('_confirmed')) return 'Confirmó una acción de la IA';
  return action;
}

export function entityLabel(entity: string | null): string {
  if (!entity) return '—';
  const l = ENTITY_LABELS[entity];
  return l ? l.charAt(0).toUpperCase() + l.slice(1) : entity;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  legalName: 'Razón social',
  email: 'Correo',
  phone: 'Teléfono',
  businessType: 'Tipo de negocio',
  country: 'País',
  currency: 'Moneda',
  timezone: 'Zona horaria',
  status: 'Estado',
  role: 'Rol',
  archived: 'Archivado',
  plan: 'Plan',
  targetMargin: 'Margen objetivo',
  operatingDays: 'Días de operación',
  roundingScale: 'Decimales',
  costMethod: 'Método de costo',
  'settings.targetMargin': 'Margen objetivo',
  'settings.operatingDays': 'Días de operación',
  'settings.roundingScale': 'Decimales',
  'settings.costMethod': 'Método de costo',
};

/** Campos técnicos que no aportan al lector. */
const HIDDEN_FIELDS =
  /(^|\.)(uuid|rowVersion|updatedAt|createdAt|slug|isDemo|onboardingCompleted)$/;

export interface DiffRow {
  key: string;
  before: string;
  after: string;
  changed: boolean;
}

function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function flatten(value: unknown, prefix = '', out: Record<string, unknown> = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else if (prefix) {
    out[prefix] = value;
  }
  return out;
}

/** Une "antes" y "después" en filas campo/antes/después; primero los campos que cambiaron. */
export function auditDiff(before: unknown, after: unknown): DiffRow[] {
  const b = flatten(typeof before === 'string' ? safeParse(before) : before);
  const a = flatten(typeof after === 'string' ? safeParse(after) : after);
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  return keys
    .filter((key) => !HIDDEN_FIELDS.test(key))
    .map((key) => ({
      key: FIELD_LABELS[key] ?? key,
      before: show(b[key]),
      after: show(a[key]),
      changed: JSON.stringify(b[key]) !== JSON.stringify(a[key]),
    }))
    .sort((x, y) => Number(y.changed) - Number(x.changed));
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return { valor: s };
  }
}
