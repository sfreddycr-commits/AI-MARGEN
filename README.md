# AImargen.com

**Sepa cuánto cuesta. Sepa cuánto gana.**

SaaS multi-tenant de costos, precios, márgenes y rentabilidad para negocios de alimentos.
Fuente de verdad del producto: [`docs/SOP_Maestro.md`](docs/SOP_Maestro.md).

## Stack

| Capa    | Tecnología                                                                            |
| ------- | ------------------------------------------------------------------------------------- |
| Web     | React 19 + TypeScript + Vite, React Router, TanStack Query, CSS Modules + tokens, PWA |
| API     | Node 22 + Fastify 5 + Zod, `/api/v1`                                                  |
| Datos   | MySQL 8, **solo stored procedures** (`sp_`), funciones (`fn_`), vistas (`vw_`)        |
| Cálculo | `packages/calculation-engine` (decimal.js) — única fuente de fórmulas                 |

Arquitectura: [`docs/architecture/overview.md`](docs/architecture/overview.md) · Decisiones: [`docs/architecture/adr/`](docs/architecture/adr/)

## Estructura

```text
aimargen/
├─ apps/
│  ├─ api/src/
│  │  ├─ core/                      config, db (callSp), http (errores)
│  │  └─ modules/<modulo>/          routes → controller → model → CALL sp_*
│  └─ web/src/
│     ├─ core/                      router, css/tokens, js/api-client, sync
│     └─ modules/<modulo>/          views/ · js/ · css/
├─ packages/
│  ├─ calculation-engine/           fórmulas (puro, sin React ni HTTP)
│  ├─ schemas/                      Zod compartido web/api
│  └─ types/                        contratos de API
├─ database/
│  ├─ migrations/V####__*.sql       tablas, índices, FKs (inmutables)
│  ├─ routines/R__sp_|fn_|vw_*.sql  un objeto por archivo (repetibles)
│  ├─ seeds/                        datos demo marcados como demo
│  ├─ scripts/                      migrate, check-conventions
│  └─ docs/conventions.md
├─ docs/                            architecture, qa, security, handoffs
├─ infra/                           docker local
└─ .github/workflows/               CI + CodeQL
```

Nota: el SOP sugería `packages/ui` y `packages/config`. Los componentes de UI viven en
`apps/web/src/core` (CSS por módulo, ADR-0005) y la configuración compartida en la raíz
(`tsconfig.base.json`, `eslint.config.js`). Se crearán como paquetes si aparece un segundo consumidor.

## Puesta en marcha local

Requisitos: Node 22, pnpm 10, Docker (o MySQL 8 instalado).

```bash
cp .env.example .env
docker compose up -d          # MySQL 8 (+ Redis con --profile redis)
pnpm install
pnpm db:migrate               # aplica migraciones y rutinas
pnpm dev                      # API :4000 · Web :5173  →  http://localhost:5173/estado
```

## Comandos

| Comando                                              | Qué hace                                               |
| ---------------------------------------------------- | ------------------------------------------------------ |
| `pnpm dev`                                           | API y web en modo desarrollo                           |
| `pnpm build`                                         | Compila todo                                           |
| `pnpm lint` / `pnpm format:check` / `pnpm typecheck` | Calidad                                                |
| `pnpm test:unit`                                     | Pruebas unitarias (sin I/O)                            |
| `pnpm test:integration`                              | Pruebas contra MySQL real (recrea `aimargen_test`)     |
| `pnpm db:migrate`                                    | Aplica migraciones pendientes                          |
| `pnpm db:check`                                      | Verifica convenciones de BD (C1–C7)                    |
| `pnpm db:reset`                                      | Recrea la base local (bloqueado en staging/producción) |

## Endpoints disponibles

- `GET /api/v1/health/live` — proceso vivo
- `GET /api/v1/health/ready` — BD + migraciones (503 si falla)

## Reglas clave

- Las fórmulas financieras viven **solo** en `packages/calculation-engine`.
- Todo acceso a datos es `CALL sp_*`; los SP de negocio reciben `p_tenant_id` primero.
- El `tenant_id` nunca viene del frontend.
- Montos como string decimal en JSON; `DECIMAL(18,6)` en BD.
- Mensajes de error en español.
- Nunca hacer commit de `.env` ni secretos.
