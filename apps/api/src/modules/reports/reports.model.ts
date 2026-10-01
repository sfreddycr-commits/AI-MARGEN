import type { Db, Row } from '../../core/db/db.js';

/** Modelo de reportes: lecturas masivas vía SPs. */
export function createReportModel(db: Db) {
  return {
    ingredients: async (t: number) =>
      (await db.call<Row>('sp_ingredient_list', [t, null, null, 'active', 5000, 0]))[0] ?? [],
    purchaseLines: (t: number, from: string | null, to: string | null) =>
      db.callOne<Row>('sp_report_purchase_lines', [t, from, to]),
    supplierPrices: (t: number, ingredientUuid: string | null, days: number) =>
      db.callOne<Row>('sp_report_supplier_prices', [t, ingredientUuid, days]),
    backup: (t: number) => db.call<Row>('sp_backup_export', [t]),
    logExport: (t: number, userId: number, report: string, format: string) =>
      db.call('sp_export_log', [t, userId, report, format]),
  };
}

export type ReportModel = ReturnType<typeof createReportModel>;
