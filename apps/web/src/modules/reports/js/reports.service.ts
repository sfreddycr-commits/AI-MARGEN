import { downloadFile, qs } from '../../../core/js/api-client';

/** Capa de datos de reportes: catálogo que expone la API y descarga de archivos. */

export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json';
export type ReportId =
  | 'products'
  | 'profitability'
  | 'ingredients'
  | 'purchases'
  | 'suppliers'
  | 'break-even'
  | 'product-sheet'
  | 'backup';

export interface ReportDef {
  id: ReportId;
  title: string;
  description: string;
  formats: ReportFormat[];
  /** Parámetros adicionales que pide el reporte. */
  params?: 'dateRange' | 'product';
}

/** Reportes y formatos que acepta GET /reports/:report (ver reports.controller.ts de la API). */
export const REPORTS: ReportDef[] = [
  {
    id: 'products',
    title: 'Productos con costo y precio',
    description: 'Cada producto con su costo por porción, precio, utilidad, margen y estado.',
    formats: ['pdf', 'xlsx', 'csv'],
  },
  {
    id: 'profitability',
    title: 'Rentabilidad',
    description:
      'De menor a mayor margen, con el precio recomendado para llegar a su margen objetivo.',
    formats: ['pdf', 'xlsx', 'csv'],
  },
  {
    id: 'product-sheet',
    title: 'Ficha de producto',
    description: 'La receta de un producto con sus ingredientes y el desglose completo del costo.',
    formats: ['pdf'],
    params: 'product',
  },
  {
    id: 'ingredients',
    title: 'Ingredientes y costos',
    description: 'Costo por unidad, rendimiento, costo efectivo y proveedor de cada ingrediente.',
    formats: ['pdf', 'xlsx', 'csv'],
  },
  {
    id: 'purchases',
    title: 'Historial de compras',
    description: 'Todas las líneas de compra del período: proveedor, factura, cantidad y costo.',
    formats: ['pdf', 'xlsx', 'csv'],
    params: 'dateRange',
  },
  {
    id: 'suppliers',
    title: 'Comparativo de proveedores',
    description:
      'Último costo, mínimo y promedio de cada ingrediente por proveedor en los últimos 180 días.',
    formats: ['pdf', 'xlsx', 'csv'],
  },
  {
    id: 'break-even',
    title: 'Punto de equilibrio',
    description: 'Sus escenarios con las ventas necesarias para no perder y la utilidad estimada.',
    formats: ['pdf', 'xlsx', 'csv'],
  },
  {
    id: 'backup',
    title: 'Respaldo completo',
    description:
      'Todos los datos de su negocio en un archivo JSON: ingredientes, compras, recetas, escenarios.',
    formats: ['json'],
  },
];

export interface ReportParams {
  from?: string;
  to?: string;
  product?: string;
}

export const reportsService = {
  download: (id: ReportId, format: ReportFormat, params: ReportParams = {}) =>
    downloadFile(`/reports/${id}${qs({ format, ...params })}`, `aimargen-${id}.${format}`),
};
