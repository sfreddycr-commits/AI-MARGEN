# ADR-0009 — Reglas de costeo (resolución de ambigüedades del SOP)

- **Estado:** Aceptado — 2026-10-01 (propuestas aceptadas por el propietario)

1. **Merma sin doble conteo**
   - Ingrediente: `rendimiento` (0 < r ≤ 1). Costo efectivo = costo unitario ÷ rendimiento.
     (merma del ingrediente = 1 − rendimiento; se captura una u otra, se guarda rendimiento).
   - Receta: `merma` opcional como % sobre el costo de ingredientes (ya efectivos).
   - Ambas nunca se aplican sobre la misma base.
2. **Costo vigente tras compra:** última compra (default), configurable por tenant a promedio ponderado.
   El historial (`ingredient_price_history`) nunca se borra.
3. **Mano de obra e indirectos:** cada componente puede ser monto fijo o % sobre costo de ingredientes.
   Empaque: monto fijo o ítems de tipo empaque.
4. **Margen válido:** `0 ≤ margen < 1`. Fuera de rango → error.
5. **Escenarios:** costo variable unitario tomado del costo por porción de un producto o ingresado manualmente.
   Un escenario nunca modifica receta ni precio base.

Costo total = ingredientes efectivos + empaque + mano de obra + indirectos + merma de receta.
