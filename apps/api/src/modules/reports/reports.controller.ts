import { Decimal, weightedAverageUnitCost } from '@aimargen/calculation-engine';
import { formatMoney, formatPercent } from '@aimargen/types';
import { AppError } from '../../core/http/app-error.js';
import { dec, day, iso } from '../../core/http/dto.js';
import type { Row } from '../../core/db/db.js';
import type { TenantContext } from '../../core/http/request-context.js';
import type { Services } from '../../core/services.js';
import type { ProductController } from '../products/products.controller.js';
import type { IngredientController } from '../ingredients/ingredients.controller.js';
import type { PlanningController } from '../planning/planning.controller.js';
import type { PurchaseController } from '../purchases/purchases.controller.js';
import type { TenantModel } from '../tenant/tenant.model.js';
import { ingredientDto } from '../ingredients/ingredients.dto.js';
import type { ReportModel } from './reports.model.js';
import {
  COLORS,
  createPdf,
  drawTable,
  finishPdf,
  toCsv,
  toPdf,
  toXlsx,
  type ReportMeta,
  type TabularReport,
} from './renderers.js';

export const REPORTS = [
  'products',
  'profitability',
  'ingredients',
  'purchases',
  'suppliers',
  'break-even',
] as const;
export type ReportId = (typeof REPORTS)[number] | 'product-sheet' | 'backup';
export type ReportFormat = 'pdf' | 'csv' | 'xlsx' | 'json';

const STATUS_LABEL: Record<string, string> = {
  healthy: 'Saludable',
  below_target: 'Bajo objetivo',
  below_cost: 'Bajo costo',
  no_price: 'Sin precio',
  incomplete: 'Incompleto',
};

export interface ReportFile {
  filename: string;
  contentType: string;
  body: Buffer;
}

/** Reportes y exportaciones (SOP §19). Las cifras salen del motor vía los controladores. */
export function createReportController(
  model: ReportModel,
  deps: {
    products: ProductController;
    ingredients: IngredientController;
    planning: PlanningController;
    purchases: PurchaseController;
    tenants: TenantModel;
  },
  s: Services,
) {
  async function meta(ctx: TenantContext): Promise<ReportMeta> {
    const t = await deps.tenants.get(ctx.tenantId);
    return {
      businessName: String(t?.name ?? 'Negocio'),
      currency: String(t?.currency ?? 'CRC'),
      scale: Number(t?.rounding_scale ?? 2),
      generatedAt: new Date(),
    };
  }

  async function build(
    ctx: TenantContext,
    id: (typeof REPORTS)[number],
    params: { from?: string; to?: string },
  ): Promise<TabularReport> {
    switch (id) {
      case 'products': {
        const list = await deps.products.all(ctx);
        return {
          title: 'Productos con costo y precio',
          columns: [
            { key: 'name', label: 'Producto', type: 'text', width: 2.2 },
            { key: 'category', label: 'Categoría', type: 'text', width: 1.3 },
            { key: 'cost', label: 'Costo por porción', type: 'money', width: 1.3 },
            { key: 'price', label: 'Precio', type: 'money', width: 1.2 },
            { key: 'profit', label: 'Utilidad', type: 'money', width: 1.2 },
            { key: 'margin', label: 'Margen', type: 'percent', width: 0.9 },
            { key: 'status', label: 'Estado', type: 'text', width: 1.1 },
          ],
          rows: list.map((p) => ({
            name: p.name,
            category: p.categoryName,
            cost: p.costPerPortion,
            price: p.currentPrice,
            profit: p.pricing.profit,
            margin: p.pricing.margin,
            status: STATUS_LABEL[p.pricing.status] ?? p.pricing.status,
          })),
        };
      }
      case 'profitability': {
        const list = (await deps.products.all(ctx)).filter((p) => p.costPerPortion !== null);
        list.sort((a, b) => new Decimal(a.pricing.margin ?? '-9').cmp(b.pricing.margin ?? '-9'));
        return {
          title: 'Rentabilidad por producto',
          subtitle:
            'Ordenado de menor a mayor margen. El precio recomendado usa el margen objetivo.',
          columns: [
            { key: 'name', label: 'Producto', type: 'text', width: 2 },
            { key: 'cost', label: 'Costo', type: 'money', width: 1.1 },
            { key: 'price', label: 'Precio actual', type: 'money', width: 1.1 },
            { key: 'margin', label: 'Margen real', type: 'percent', width: 0.9 },
            { key: 'target', label: 'Objetivo', type: 'percent', width: 0.9 },
            { key: 'recommended', label: 'Precio recomendado', type: 'money', width: 1.2 },
            { key: 'difference', label: 'Diferencia', type: 'money', width: 1.1 },
          ],
          rows: list.map((p) => ({
            name: p.name,
            cost: p.costPerPortion,
            price: p.currentPrice,
            margin: p.pricing.margin,
            target: p.effectiveTargetMargin,
            recommended: p.pricing.recommendedPrice,
            difference:
              p.pricing.recommendedPrice && p.currentPrice
                ? new Decimal(p.pricing.recommendedPrice).minus(p.currentPrice).toFixed(6)
                : null,
          })),
        };
      }
      case 'ingredients': {
        const rows = (await model.ingredients(ctx.tenantId)).map(ingredientDto);
        return {
          title: 'Ingredientes y costos',
          columns: [
            { key: 'name', label: 'Ingrediente', type: 'text', width: 2 },
            { key: 'category', label: 'Categoría', type: 'text', width: 1.2 },
            { key: 'unit', label: 'Unidad', type: 'text', width: 0.7 },
            { key: 'cost', label: 'Costo por unidad', type: 'money', width: 1.2 },
            { key: 'yield', label: 'Rendimiento', type: 'percent', width: 0.9 },
            { key: 'effective', label: 'Costo efectivo', type: 'money', width: 1.2 },
            { key: 'supplier', label: 'Proveedor', type: 'text', width: 1.3 },
            { key: 'date', label: 'Último costo', type: 'date', width: 0.9 },
          ],
          rows: rows.map((i) => ({
            name: i.name,
            category: i.categoryName,
            unit: i.unit,
            cost: i.unitCost,
            yield: i.yield,
            effective: i.effectiveUnitCost,
            supplier: i.supplierName,
            date: i.lastCostAt,
          })),
        };
      }
      case 'purchases': {
        const rows = await model.purchaseLines(
          ctx.tenantId,
          params.from ?? null,
          params.to ?? null,
        );
        return {
          title: 'Historial de compras',
          subtitle:
            params.from || params.to
              ? `Período: ${params.from ?? 'inicio'} a ${params.to ?? 'hoy'}`
              : undefined,
          columns: [
            { key: 'date', label: 'Fecha', type: 'date', width: 0.9 },
            { key: 'supplier', label: 'Proveedor', type: 'text', width: 1.3 },
            { key: 'reference', label: 'Factura', type: 'text', width: 0.9 },
            { key: 'ingredient', label: 'Ingrediente', type: 'text', width: 1.6 },
            { key: 'quantity', label: 'Cantidad', type: 'number', width: 0.8 },
            { key: 'unit', label: 'Unidad', type: 'text', width: 0.7 },
            { key: 'total', label: 'Total línea', type: 'money', width: 1.1 },
            { key: 'unitCost', label: 'Costo unitario', type: 'money', width: 1.1 },
          ],
          rows: rows.map((r: Row) => ({
            date: day(r.purchased_at),
            supplier: r.supplier_name ?? null,
            reference: r.reference ?? null,
            ingredient: String(r.ingredient_name),
            quantity: dec(r.quantity),
            unit: String(r.unit),
            total: dec(r.line_total),
            unitCost: `${dec(r.unit_cost)}`,
          })),
          notes: ['El costo unitario está expresado en la unidad de costeo de cada ingrediente.'],
        };
      }
      case 'suppliers': {
        const rows = await model.supplierPrices(ctx.tenantId, null, 180);
        const groups = new Map<string, Row[]>();
        for (const r of rows) {
          const k = `${r.ingredient_uuid}|${r.supplier_uuid}`;
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k)!.push(r);
        }
        const out = [...groups.values()].map((g) => {
          const first = g[0]!;
          const costs = g.map((r) => new Decimal(String(r.unit_cost)));
          const min = costs.reduce((a, b) => (b.lt(a) ? b : a));
          const avg = weightedAverageUnitCost(
            g
              .filter((r) => r.quantity !== null)
              .map((r) => ({ quantity: String(r.quantity), unitCost: String(r.unit_cost) })),
          );
          return {
            ingredient: String(first.ingredient_name),
            unit: String(first.unit),
            supplier: String(first.supplier_name),
            last: dec(first.unit_cost),
            min: min.toFixed(6),
            average: avg,
            count: g.length,
            date: iso(first.effective_at),
          };
        });
        return {
          title: 'Comparativo de proveedores',
          subtitle: 'Costos de los últimos 180 días por ingrediente y proveedor.',
          columns: [
            { key: 'ingredient', label: 'Ingrediente', type: 'text', width: 1.6 },
            { key: 'unit', label: 'Unidad', type: 'text', width: 0.7 },
            { key: 'supplier', label: 'Proveedor', type: 'text', width: 1.5 },
            { key: 'last', label: 'Último costo', type: 'money', width: 1.1 },
            { key: 'min', label: 'Mínimo', type: 'money', width: 1 },
            { key: 'average', label: 'Promedio ponderado', type: 'money', width: 1.2 },
            { key: 'count', label: 'Compras', type: 'number', width: 0.7 },
            { key: 'date', label: 'Última compra', type: 'date', width: 0.9 },
          ],
          rows: out,
        };
      }
      case 'break-even': {
        const scenarios = await deps.planning.listScenarios(ctx);
        return {
          title: 'Punto de equilibrio por escenario',
          columns: [
            { key: 'name', label: 'Escenario', type: 'text', width: 1.6 },
            { key: 'price', label: 'Precio', type: 'money', width: 1 },
            { key: 'variable', label: 'Costo variable', type: 'money', width: 1.1 },
            { key: 'fixed', label: 'Costos fijos', type: 'money', width: 1.1 },
            { key: 'units', label: 'Equilibrio (unid./mes)', type: 'number', width: 1.1 },
            { key: 'revenue', label: 'Equilibrio (ventas)', type: 'money', width: 1.2 },
            { key: 'profit', label: 'Utilidad estimada', type: 'money', width: 1.2 },
          ],
          rows: scenarios.map((sc) => ({
            name: sc.name,
            price: sc.price,
            variable: sc.result?.inputs.variableUnitCost ?? sc.variableUnitCost,
            fixed: sc.result?.fixedCosts ?? null,
            units: sc.result?.breakEven?.unitsRounded ?? null,
            revenue: sc.result?.breakEven?.revenue ?? null,
            profit: sc.result?.profit ?? null,
          })),
          notes: ['Escenarios hipotéticos: no modifican recetas ni precios.'],
        };
      }
    }
  }

  async function productSheet(ctx: TenantContext, uuid: string, m: ReportMeta): Promise<Buffer> {
    const p = await deps.products.get(ctx, uuid);
    const money = (v: string | null) => (v === null ? '—' : formatMoney(v, m.currency, m.scale));
    const doc = createPdf(m, `Ficha de producto: ${p.name}`);
    const kv = (label: string, value: string) => {
      doc
        .font('regular')
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text(label, { continued: true, width: 300 });
      doc.font('bold').fillColor('#0F172A').text(`  ${value}`);
    };
    kv('Categoría:', p.categoryName ?? 'Sin categoría');
    kv('Porciones:', p.portions);
    kv('Costo total de la receta:', money(p.breakdown.totalCost));
    kv('Costo por porción:', money(p.breakdown.costPerPortion));
    kv('Precio actual:', money(p.currentPrice));
    kv('Utilidad por porción:', money(p.analysis?.current?.profit ?? null));
    kv(
      'Margen real:',
      p.analysis?.current?.margin ? formatPercent(p.analysis.current.margin) : '—',
    );
    kv('Margen objetivo:', p.effectiveTargetMargin ? formatPercent(p.effectiveTargetMargin) : '—');
    kv('Precio por margen objetivo:', money(p.analysis?.byMargin?.price ?? null));
    doc.moveDown(0.8);
    doc.font('bold').fontSize(12).fillColor(COLORS.deep).text('Receta');
    doc.moveDown(0.3);
    drawTable(
      doc,
      [
        { key: 'name', label: 'Ingrediente', type: 'text', width: 2 },
        { key: 'qty', label: 'Cantidad', type: 'number', width: 0.9 },
        { key: 'unit', label: 'Unidad', type: 'text', width: 0.7 },
        { key: 'unitCost', label: 'Costo unitario', type: 'money', width: 1.1 },
        { key: 'yield', label: 'Rendimiento', type: 'percent', width: 0.9 },
        { key: 'cost', label: 'Costo', type: 'money', width: 1.1 },
      ],
      p.breakdown.items.map((i) => ({
        name: i.ingredientName,
        qty: i.quantity,
        unit: i.unit,
        unitCost: i.unitCost,
        yield: i.yield,
        cost: i.cost,
      })),
      m,
    );
    doc.moveDown(0.8);
    doc.font('bold').fontSize(12).fillColor(COLORS.deep).text('Desglose de costo');
    doc.moveDown(0.3);
    drawTable(
      doc,
      [
        { key: 'concept', label: 'Concepto', type: 'text', width: 2 },
        { key: 'amount', label: 'Monto', type: 'money', width: 1 },
      ],
      [
        { concept: 'Ingredientes', amount: p.breakdown.ingredientsCost },
        { concept: 'Empaque', amount: p.breakdown.packagingCost },
        { concept: 'Mano de obra', amount: p.breakdown.laborCost },
        { concept: 'Costos indirectos', amount: p.breakdown.overheadCost },
        { concept: 'Merma de la receta', amount: p.breakdown.wasteCost },
        { concept: 'Costo total', amount: p.breakdown.totalCost },
      ],
      m,
    );
    if (p.breakdown.warnings.length) {
      doc.moveDown(0.6);
      doc.font('regular').fontSize(9).fillColor('#8A5200');
      for (const w of p.breakdown.warnings) doc.text(`• ${w.message}`);
    }
    return finishPdf(doc);
  }

  async function backup(ctx: TenantContext): Promise<Buffer> {
    const sets = await model.backup(ctx.tenantId);
    const keys = [
      'business',
      'categories',
      'suppliers',
      'ingredients',
      'priceHistory',
      'purchases',
      'purchaseItems',
      'products',
      'recipeItems',
      'fixedCosts',
      'scenarios',
    ];
    const data: Record<string, unknown> = {
      format: 'aimargen-backup',
      version: 1,
      generatedAt: new Date().toISOString(),
    };
    keys.forEach((k, i) => {
      const rows = sets[i] ?? [];
      data[k] = k === 'business' ? (rows[0] ?? null) : rows;
    });
    return Buffer.from(JSON.stringify(data, null, 2), 'utf8');
  }

  return {
    async generate(
      ctx: TenantContext,
      id: ReportId,
      format: ReportFormat,
      params: { from?: string; to?: string; product?: string },
    ): Promise<ReportFile> {
      const m = await meta(ctx);
      const stamp = m.generatedAt.toISOString().slice(0, 10);
      let file: ReportFile;
      if (id === 'backup') {
        if (format !== 'json')
          throw new AppError(400, 'INVALID_FORMAT', 'El respaldo se descarga en formato JSON.');
        file = {
          filename: `aimargen-respaldo-${stamp}.json`,
          contentType: 'application/json',
          body: await backup(ctx),
        };
      } else if (id === 'product-sheet') {
        if (!params.product) throw new AppError(400, 'PRODUCT_REQUIRED', 'Elija el producto.');
        if (format !== 'pdf')
          throw new AppError(400, 'INVALID_FORMAT', 'La ficha de producto se descarga en PDF.');
        file = {
          filename: `ficha-producto-${stamp}.pdf`,
          contentType: 'application/pdf',
          body: await productSheet(ctx, params.product, m),
        };
      } else {
        if (format === 'json')
          throw new AppError(400, 'INVALID_FORMAT', 'Formato no disponible para este reporte.');
        const report = await build(ctx, id, params);
        const body =
          format === 'csv'
            ? toCsv(report)
            : format === 'xlsx'
              ? await toXlsx(report, m)
              : await toPdf(report, m);
        const types = {
          csv: 'text/csv; charset=utf-8',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          pdf: 'application/pdf',
        };
        file = { filename: `aimargen-${id}-${stamp}.${format}`, contentType: types[format], body };
      }
      await model.logExport(ctx.tenantId, ctx.userId, id, format);
      await s.audit.log(ctx, {
        action: 'report.export',
        entity: 'report',
        after: { report: id, format },
      });
      return file;
    },
  };
}

export type ReportController = ReturnType<typeof createReportController>;
