import type { FixedCostInput, ScenarioInput } from '@aimargen/schemas';
import type { Db, Row } from '../../core/db/db.js';

/** Modelo de planificación: costos fijos y escenarios. Solo llamadas a SPs. */
export function createPlanningModel(db: Db) {
  return {
    fixedCosts: (t: number, archived = false) =>
      db.callOne<Row>('sp_fixed_cost_list', [t, archived ? 1 : 0]),
    saveFixedCost: async (
      t: number,
      userId: number,
      uuid: string | null,
      p: FixedCostInput,
      isDemo = false,
    ) =>
      (
        await db.callOne<Row>('sp_fixed_cost_save', [
          t,
          userId,
          uuid,
          p.name,
          p.monthlyAmount,
          p.notes,
          p.rowVersion ?? null,
          isDemo ? 1 : 0,
        ])
      )[0]!,
    setFixedCostArchived: async (t: number, userId: number, uuid: string, archived: boolean) =>
      (
        await db.callOne<Row>('sp_fixed_cost_set_archived', [t, userId, uuid, archived ? 1 : 0])
      )[0]!,
    fixedCostChanges: (t: number, since: Date | null, sinceUuid: string | null, limit: number) =>
      db.callOne<Row>('sp_fixed_cost_changes', [t, since, sinceUuid, limit]),

    scenarios: (t: number, archived = false) =>
      db.callOne<Row>('sp_scenario_list', [t, archived ? 1 : 0]),
    scenario: async (t: number, uuid: string) =>
      (await db.callOne<Row>('sp_scenario_get', [t, uuid]))[0] ?? null,
    saveScenario: async (
      t: number,
      userId: number,
      uuid: string | null,
      p: ScenarioInput,
      isDemo = false,
    ) =>
      (
        await db.callOne<Row>('sp_scenario_save', [
          t,
          userId,
          uuid,
          p.name,
          p.productUuid,
          p.price,
          p.unitsPerDay,
          p.daysPerMonth,
          p.fixedCosts,
          p.variableUnitCost,
          p.variableSource,
          p.notes,
          p.rowVersion ?? null,
          isDemo ? 1 : 0,
        ])
      )[0]!,
    setScenarioArchived: async (t: number, userId: number, uuid: string, archived: boolean) =>
      (await db.callOne<Row>('sp_scenario_set_archived', [t, userId, uuid, archived ? 1 : 0]))[0]!,
    scenarioChanges: (t: number, since: Date | null, sinceUuid: string | null, limit: number) =>
      db.callOne<Row>('sp_scenario_changes', [t, since, sinceUuid, limit]),
  };
}

export type PlanningModel = ReturnType<typeof createPlanningModel>;
