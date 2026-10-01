import { CalculationError, Decimal, simulateScenario } from '@aimargen/calculation-engine';
import type { FixedCostInput, ScenarioCalculateInput, ScenarioInput } from '@aimargen/schemas';
import { AppError } from '../../core/http/app-error.js';
import { DbError } from '../../core/db/db-error.js';
import type { TenantContext } from '../../core/http/request-context.js';
import type { Services } from '../../core/services.js';
import type { ProductController } from '../products/products.controller.js';
import type { PlanningModel } from './planning.model.js';
import { fixedCostDto, scenarioDto, scenarioResultDto } from './planning.dto.js';

/**
 * Costos fijos, escenarios y punto de equilibrio (SOP §18).
 * Un escenario nunca modifica recetas ni precios: solo guarda sus propios supuestos.
 */
export function createPlanningController(
  model: PlanningModel,
  products: ProductController,
  s: Services,
) {
  async function fixedTotal(ctx: TenantContext): Promise<string> {
    const rows = await model.fixedCosts(ctx.tenantId);
    return rows.reduce((acc, r) => acc.plus(String(r.monthly_amount)), new Decimal(0)).toString();
  }

  /** Costo variable unitario: el costo por porción vigente del producto o el valor manual. */
  async function variableCost(
    ctx: TenantContext,
    input: Pick<ScenarioCalculateInput, 'productUuid' | 'variableSource' | 'variableUnitCost'>,
  ) {
    if (input.variableSource === 'product' && input.productUuid) {
      const p = await products.get(ctx, input.productUuid);
      if (p.costPerPortion)
        return { value: p.costPerPortion, source: 'product' as const, productName: p.name };
    }
    return { value: input.variableUnitCost, source: 'manual' as const, productName: null };
  }

  async function simulate(ctx: TenantContext, input: ScenarioCalculateInput) {
    const fixed = input.fixedCosts ?? (await fixedTotal(ctx));
    const variable = await variableCost(ctx, input);
    try {
      const result = simulateScenario({
        price: input.price,
        unitsPerDay: input.unitsPerDay,
        daysPerMonth: input.daysPerMonth,
        fixedCosts: fixed,
        variableUnitCost: variable.value,
      });
      return {
        ...scenarioResultDto(result),
        inputs: {
          fixedCostsSource:
            input.fixedCosts === null ? ('business' as const) : ('scenario' as const),
          variableUnitCost: new Decimal(variable.value).toString(),
          variableSource: variable.source,
        },
      };
    } catch (e) {
      if (e instanceof CalculationError) throw new AppError(422, e.code, e.message);
      throw e;
    }
  }

  function mapDbError(e: unknown, what: string): never {
    if (e instanceof DbError && e.code === 'ERR_DUPLICATE')
      throw new AppError(409, 'DUPLICATE_NAME', `Ya existe ${what} con ese nombre.`);
    if (e instanceof DbError && e.code === 'ERR_NOT_FOUND')
      throw new AppError(404, 'NOT_FOUND', 'No se encontró el registro.');
    if (e instanceof DbError && e.code === 'ERR_VALIDATION')
      throw new AppError(422, 'INVALID_PRODUCT', 'El producto elegido no existe.');
    throw e;
  }

  return {
    fixedTotal,

    async listFixedCosts(ctx: TenantContext) {
      const items = (await model.fixedCosts(ctx.tenantId)).map(fixedCostDto);
      const total = items.reduce((acc, i) => acc.plus(i.monthlyAmount), new Decimal(0)).toString();
      return { items, total };
    },
    async saveFixedCost(
      ctx: TenantContext,
      id: string | null,
      input: FixedCostInput,
      isDemo = false,
    ) {
      if (id && !input.rowVersion)
        throw new AppError(400, 'ROW_VERSION_REQUIRED', 'Falta la versión del registro.');
      let row;
      try {
        row = fixedCostDto(await model.saveFixedCost(ctx.tenantId, ctx.userId, id, input, isDemo));
      } catch (e) {
        mapDbError(e, 'un costo fijo');
      }
      await s.audit.log(ctx, {
        action: id ? 'fixed_cost.update' : 'fixed_cost.create',
        entity: 'fixed_cost',
        entityUuid: row.uuid,
        after: row,
      });
      return row;
    },
    async setFixedCostArchived(ctx: TenantContext, id: string, archived: boolean) {
      let row;
      try {
        row = fixedCostDto(
          await model.setFixedCostArchived(ctx.tenantId, ctx.userId, id, archived),
        );
      } catch (e) {
        mapDbError(e, 'un costo fijo');
      }
      await s.audit.log(ctx, {
        action: archived ? 'fixed_cost.archive' : 'fixed_cost.restore',
        entity: 'fixed_cost',
        entityUuid: id,
      });
      return row;
    },

    async listScenarios(ctx: TenantContext) {
      const rows = (await model.scenarios(ctx.tenantId)).map(scenarioDto);
      const items = [];
      for (const sc of rows) {
        let result = null;
        try {
          result = await simulate(ctx, sc);
        } catch {
          result = null;
        }
        items.push({ ...sc, result });
      }
      return items;
    },
    async getScenario(ctx: TenantContext, id: string) {
      const row = await model.scenario(ctx.tenantId, id);
      if (!row) throw new AppError(404, 'NOT_FOUND', 'No se encontró el escenario.');
      const sc = scenarioDto(row);
      return { ...sc, result: await simulate(ctx, sc) };
    },
    calculate: simulate,
    async saveScenario(
      ctx: TenantContext,
      id: string | null,
      input: ScenarioInput,
      isDemo = false,
    ) {
      if (id && !input.rowVersion)
        throw new AppError(400, 'ROW_VERSION_REQUIRED', 'Falta la versión del registro.');
      // Valida que el escenario se pueda calcular antes de guardarlo.
      await simulate(ctx, input);
      let row;
      try {
        row = scenarioDto(await model.saveScenario(ctx.tenantId, ctx.userId, id, input, isDemo));
      } catch (e) {
        mapDbError(e, 'un escenario');
      }
      await s.audit.log(ctx, {
        action: id ? 'scenario.update' : 'scenario.create',
        entity: 'scenario',
        entityUuid: row.uuid,
        after: row,
      });
      return { ...row, result: await simulate(ctx, row) };
    },
    async setScenarioArchived(ctx: TenantContext, id: string, archived: boolean) {
      let row;
      try {
        row = scenarioDto(await model.setScenarioArchived(ctx.tenantId, ctx.userId, id, archived));
      } catch (e) {
        mapDbError(e, 'un escenario');
      }
      await s.audit.log(ctx, {
        action: archived ? 'scenario.archive' : 'scenario.restore',
        entity: 'scenario',
        entityUuid: id,
      });
      return row;
    },
  };
}

export type PlanningController = ReturnType<typeof createPlanningController>;
