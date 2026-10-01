import type { z } from 'zod';
import { CalculationError, analyzePricing } from '@aimargen/calculation-engine';
import type { pricingCalculateInput } from '@aimargen/schemas';
import { AppError } from '../../core/http/app-error.js';
import type { TenantContext } from '../../core/http/request-context.js';
import type { ProductController } from '../products/products.controller.js';
import { analysisDto, pricingSummary } from '../products/products.dto.js';

/**
 * Precio y rentabilidad (SOP §17): precio actual, margen actual y objetivo, precio por margen,
 * por multiplicador, utilidad, margen real y diferencia contra el recomendado.
 */
export function createPricingController(products: ProductController) {
  return {
    async overview(ctx: TenantContext) {
      const list = await products.all(ctx);
      return list.map((p) => {
        const s = pricingSummary(
          p.costPerPortion,
          p.currentPrice,
          p.effectiveTargetMargin,
          p.multiplier,
          p.costComplete,
        );
        return {
          uuid: p.uuid,
          name: p.name,
          categoryName: p.categoryName,
          costPerPortion: p.costPerPortion,
          costComplete: p.costComplete,
          currentPrice: p.currentPrice,
          targetMargin: p.targetMargin,
          effectiveTargetMargin: p.effectiveTargetMargin,
          multiplier: p.multiplier,
          status: s.status,
          analysis: analysisDto(s.analysis),
          rowVersion: p.rowVersion,
        };
      });
    },

    calculate(input: z.infer<typeof pricingCalculateInput>) {
      try {
        return analysisDto(analyzePricing(input));
      } catch (e) {
        if (e instanceof CalculationError) throw new AppError(422, e.code, e.message);
        throw e;
      }
    },
  };
}

export type PricingController = ReturnType<typeof createPricingController>;
