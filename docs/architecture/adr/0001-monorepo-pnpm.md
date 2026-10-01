# ADR-0001 — Monorepo con pnpm workspaces

- **Estado:** Aceptado — 2026-10-01
- **Contexto:** SOP §42 recomienda monorepo; web, api y el motor de cálculo comparten tipos y esquemas.
- **Decisión:** pnpm workspaces. `apps/web`, `apps/api`, `packages/*`. TypeScript estricto en todo.
  Node 22 LTS. Sin herramientas de build orquestado (Turbo/Nx) hasta que el tiempo de CI lo justifique.
- **Consecuencias:** un solo `pnpm install`; los paquetes internos se consumen como `workspace:*`.
