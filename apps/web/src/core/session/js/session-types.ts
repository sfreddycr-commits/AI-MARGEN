/** Respuesta de GET /auth/me (y de POST /auth/login). */
export interface TenantSettings {
  targetMargin: string | null;
  operatingDays: number | null;
  roundingScale: number;
  costMethod: 'last_purchase' | 'weighted_average';
  rowVersion: number;
}

export interface Tenant {
  uuid: string;
  name: string;
  slug: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  businessType: string | null;
  country: string;
  currency: string;
  timezone: string;
  status: string;
  plan: string;
  isDemo: boolean;
  onboardingCompleted: boolean;
  rowVersion: number;
  createdAt: string | null;
  settings: TenantSettings;
}

export interface Me {
  user: {
    uuid: string;
    name: string;
    email: string;
    role: string;
    emailVerified: boolean;
    lastLoginAt: string | null;
  };
  tenant: Tenant | null;
  permissions: string[];
  flags: Record<string, boolean>;
  aiEnabled: boolean;
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Administrador de la plataforma',
  tenant_owner: 'Dueño',
  tenant_admin: 'Administrador',
  manager: 'Encargado',
  operator: 'Operador',
  viewer: 'Solo lectura',
};
