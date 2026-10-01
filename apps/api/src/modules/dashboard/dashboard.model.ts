import type { Db, Row } from '../../core/db/db.js';

/** Modelo del dashboard: conteos y variaciones de costo desde SPs. */
export function createDashboardModel(db: Db) {
  return {
    counts: async (t: number) => (await db.callOne<Row>('sp_dashboard_counts', [t]))[0]!,
    costChanges: (t: number, days: number) =>
      db.callOne<Row>('sp_ingredient_cost_changes', [t, days]),
  };
}

export type DashboardModel = ReturnType<typeof createDashboardModel>;
