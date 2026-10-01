# ADR-0006 — Aritmética decimal y redondeo

- **Estado:** Aceptado — 2026-10-01
- **Decisión:**
  - Motor de cálculo con `decimal.js` (precisión 34 dígitos, `ROUND_HALF_UP`).
  - Columnas monetarias y cantidades: `DECIMAL(18,6)`; porcentajes: `DECIMAL(9,6)` como fracción (0.40 = 40%).
  - El motor calcula sin redondear; el redondeo se aplica solo al presentar o persistir resultados
    finales, con escala configurable por tenant (default 2 decimales).
  - Los montos viajan en JSON como **string** decimal, nunca como `number`.
- **Validaciones del motor:** división entre cero → error controlado; margen fuera de `0 ≤ m < 1` → error;
  cantidades/precios negativos → error; precio < costo → warning.
