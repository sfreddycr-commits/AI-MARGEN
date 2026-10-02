/** Capa de datos del dashboard: tipos de la respuesta de GET /dashboard. Sin lógica de pantalla. */

export type AlertSeverity = 'danger' | 'warning' | 'info';

export interface DashboardAlert {
  code: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  link: string | null;
}

export interface DashboardInsight {
  code: string;
  text: string;
  link: string | null;
  /** Cifras exactas usadas en el texto (trazabilidad). */
  figures: Record<string, string | null>;
}

export interface DashboardKpis {
  productsCount: number;
  productsNoPrice: number;
  productsBelowTarget: number;
  productsBelowCost: number;
  ingredientsCount: number;
  ingredientsMissingCost: number;
  averageCostPerPortion: string | null;
  averageMargin: string | null;
  fixedCostsMonthly: string | null;
  activeScenario: {
    uuid: string;
    name: string;
    profit: string | null;
    breakEvenUnits: number | null;
    breakEvenRevenue: string | null;
  } | null;
}

export interface DashboardSetup {
  hasIngredients: boolean;
  hasProducts: boolean;
  hasPurchases: boolean;
  hasScenarios: boolean;
  onboardingCompleted: boolean;
}

export interface Dashboard {
  currency: string;
  roundingScale: number;
  kpis: DashboardKpis;
  alerts: DashboardAlert[];
  insights: DashboardInsight[];
  setup: DashboardSetup;
}

/** Producto tal como lo guarda la sincronización local (solo los campos que usa el inicio). */
export interface HomeProduct {
  uuid: string;
  name: string;
  currentPrice: string | null;
  costPerPortion: string | null;
  effectiveTargetMargin: string | null;
  pricing: {
    status: 'incomplete' | 'no_price' | 'below_cost' | 'below_target' | 'healthy';
    profit: string | null;
    margin: string | null;
    recommendedPrice: string | null;
  };
  archived: boolean;
}

export const DASHBOARD_PATH = '/dashboard';
