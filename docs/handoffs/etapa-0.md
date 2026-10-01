# Handoff — Etapa 0: Preparación

```text
ETAPA:          0 — Preparación
ESTADO:         COMPLETADA (gate "proyecto compila": PASS)
BRANCH:         main
COMMIT/SHA:     ver `git log` (commit "Etapa 0: preparación del monorepo")
```

## Implementado

- Monorepo pnpm: `apps/api`, `apps/web`, `packages/{calculation-engine,schemas,types}`, `database`.
- TypeScript estricto, ESLint (con reglas de arquitectura: web no importa mysql2; API/motor no importan React),
  Stylelint (sin colores literales fuera de `tokens.css`), Prettier, EditorConfig.
- API Fastify por módulos (`routes → controller → model → CALL sp_*`), config tipada, helper `db.call()` que
  **solo** permite `sp_*`, errores uniformes en español, request-id, helmet, CORS, logs con redacción.
- Módulo `system`: `/api/v1/health/live`, `/health/ready` (BD + migraciones vía `sp_system_ping`).
- Web React por módulos (`views/ js/ css/`), tokens de diseño, cliente API con CSRF header,
  vista `/estado` que verifica web → API → SP → MySQL.
- Motor de cálculo: base Decimal (precisión 34, HALF_UP), redondeo configurable, errores controlados en español.
- Runner de migraciones: versionadas inmutables (checksum) + rutinas repetibles `R__sp_/fn_/vw_`, soporte
  `DELIMITER`, lock de concurrencia, reset bloqueado en staging/producción.
- `db:check`: reglas C1–C7 (prefijos, PK, FK en `*_id`, índice por `tenant_id`, `p_tenant_id` primero en SPs).
- Docker Compose local (MySQL 8.4 + Redis opcional). CI GitHub Actions (calidad + integración con MySQL real),
  CodeQL, Dependabot.
- Documentación: arquitectura, 10 ADRs, riesgos multi-tenant, gates de CI, convenciones de BD.

## Pruebas ejecutadas (instalación limpia)

| Gate                                                       | Resultado                 |
| ---------------------------------------------------------- | ------------------------- |
| install --frozen-lockfile                                  | PASS                      |
| format:check                                               | PASS                      |
| lint                                                       | PASS                      |
| typecheck (6 proyectos)                                    | PASS                      |
| unit                                                       | PASS — 20/20              |
| db:check                                                   | PASS                      |
| migraciones en limpio + segunda corrida sin cambios        | PASS                      |
| integration (MySQL 8.0.46 real)                            | PASS — 10/10              |
| build (api + web)                                          | PASS                      |
| audit prod high/critical                                   | PASS — 0 vulnerabilidades |
| Smoke: build ejecutado + `pnpm dev` (proxy web → API → SP) | PASS                      |

## Bugs abiertos

Ninguno.

## Riesgos / notas

- El entorno de trabajo no tiene acceso a Docker Hub; aquí MySQL corre instalado (8.0.46). CI usa MySQL 8.4.
  Se mantiene compatibilidad con ambos.
- Workflows de CI escritos pero aún no ejecutados en GitHub (el repo no está publicado).
- `version` en health muestra `0.0.0` al correr `node dist/server.js` directamente; se fijará en el pipeline de release.
- Pruebas visuales/E2E (Playwright) entran en Etapa 2.

## Siguiente etapa

Etapa 1 — Fundación: design system, router y layout (shell desktop/móvil), tablas base
(`tenants`, `users`, `roles`, `tenant_data_versions`…), PWA base, observabilidad, cimiento de IndexedDB/sync.
