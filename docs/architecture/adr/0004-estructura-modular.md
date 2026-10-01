# ADR-0004 — Estructura por módulos (backend y frontend)

- **Estado:** Aceptado — 2026-10-01 (requisito del propietario del producto)
- **Decisión backend** (`apps/api/src/modules/<modulo>/`):
  - `<modulo>.routes.ts` — endpoints, auth, extracción del contexto de tenant.
  - `<modulo>.schema.ts` — validación Zod de entrada/salida.
  - `<modulo>.controller.ts` — lógica: valida, autoriza, usa el motor de cálculo, llama al modelo.
  - `<modulo>.model.ts` — recibe datos y los envía a SPs. Sin lógica.
- **Decisión frontend** (`apps/web/src/modules/<modulo>/`):
  - `views/` — componentes React (`.tsx`). Todas las vistas se renderizan desde JS en el cliente.
  - `js/` — servicios API, hooks (TanStack Query), lógica de UI, sincronización con IndexedDB.
  - `css/` — CSS Modules del módulo (`*.module.css`).
- **Código compartido:** `apps/*/src/core/` (infraestructura) y `packages/*`.
- **Consecuencias:** cada módulo es autocontenido y se puede revisar/probar de forma aislada.
