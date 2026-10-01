# AImargen — Arquitectura

Fuente de verdad del producto: `docs/SOP_Maestro.md`.
Este documento resume **cómo** se implementa. Las decisiones puntuales están en `docs/architecture/adr/`.

## Vista general

```
┌────────────────────── apps/web (React + Vite, PWA) ──────────────────────┐
│ modules/<modulo>/views  → componentes React (todas las vistas se          │
│                           renderizan en el cliente; el backend no         │
│                           devuelve HTML)                                  │
│ modules/<modulo>/js     → servicios API, hooks, lógica de UI, sync        │
│ modules/<modulo>/css    → CSS Modules propios del módulo                  │
│ core/                   → router, shell, design tokens, IndexedDB/sync    │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ JSON  /api/v1  (cookies HttpOnly)
┌───────────────────────────────▼──────────────────────────────────────────┐
│ apps/api (Fastify + TypeScript)                                           │
│  modules/<modulo>/<modulo>.routes.ts      → HTTP, auth, permisos          │
│  modules/<modulo>/<modulo>.schema.ts      → validación Zod                │
│  modules/<modulo>/<modulo>.controller.ts  → lógica: valida, autoriza,     │
│                                             usa calculation-engine,       │
│                                             llama al modelo               │
│  modules/<modulo>/<modulo>.model.ts       → solo CALL sp_... con          │
│                                             parámetros; sin lógica        │
│  core/db                                  → pool mysql2 + helper callSp   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ CALL sp_*(p_tenant_id, ...)
┌───────────────────────────────▼──────────────────────────────────────────┐
│ MySQL 8 — tablas + sp_* + fn_* + vw_* (todo versionado en migraciones)    │
└───────────────────────────────────────────────────────────────────────────┘

packages/calculation-engine → librería pura (Decimal). ÚNICA fuente de fórmulas.
packages/schemas            → esquemas Zod compartidos web/api.
packages/types              → tipos compartidos.
packages/config             → configuración compartida (tsconfig, eslint).
```

## Reglas de capas

| Capa               | Hace                                                   | No hace              |
| ------------------ | ------------------------------------------------------ | -------------------- |
| View (web)         | Renderiza, captura datos, muestra errores              | Fórmulas financieras |
| JS (web)           | Llama API, maneja cache IndexedDB y sync               | Decidir permisos     |
| Route (api)        | Monta endpoint, autentica, extrae contexto de tenant   | Lógica de negocio    |
| Controller (api)   | Valida, autoriza, calcula con el motor, orquesta       | SQL                  |
| Model (api)        | `CALL sp_*` con parámetros                             | Lógica, SQL dinámico |
| SP (MySQL)         | Persistencia, filtros por tenant, historial, auditoría | Fórmulas financieras |
| calculation-engine | Todas las fórmulas, con Decimal                        | I/O, HTTP, React     |

## Multi-tenancy

- El `tenant_id` se obtiene **solo** del contexto autenticado (JWT de acceso en cookie HttpOnly).
- Cada SP de datos de negocio recibe `p_tenant_id` como primer parámetro y filtra por él.
- Los IDs expuestos al frontend son `uuid` (CHAR(36)/BINARY(16)), nunca el `id` autoincremental.
- Las pruebas cross-tenant corren en CI contra MySQL real.

## Cache local y sincronización

- `localStorage`: solo preferencias pequeñas, nunca tokens ni datos del negocio.
- IndexedDB: catálogos casi fijos y datos del negocio, con delta sync por `data_version`.
- Momentos de sync: login/apertura, write-through tras mutación propia, al volver a la app,
  cada 60 s con la app visible (solo versión), al reconectar; limpieza total al cerrar sesión.
- Concurrencia optimista con `row_version`.

Detalle en ADR-0007.

## Web: estructura de `core/` (Etapa 1)

| Carpeta       | Contenido                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `core/css`    | `tokens.css` (único lugar con colores literales), `base.css`, `fonts.css`                      |
| `core/fonts`  | Inter 4 variable autoalojada (offline)                                                         |
| `core/ui`     | design system: `views/` componentes, `css/` estilos, `js/` hooks/utilidades                    |
| `core/shell`  | AppShell (sidebar desktop, barra inferior móvil), Page, "Más", aviso offline, actualizador PWA |
| `core/router` | rutas y registro de navegación por etapas (ADR-0011)                                           |
| `core/js`     | cliente API, formato CR (₡), IndexedDB local, motor de sincronización, preferencias            |

## API: servicios transversales (Etapa 1)

- `core/observability`: métricas Prometheus en `/api/v1/metrics` (con token; oculto en producción sin token).
- `core/http/request-context`: `req.ctx` con requestId, IP, user agent; tenant/usuario se completan en Etapa 3.
- `core/audit`: `app.audit.log(ctx, entry)` → `sp_audit_log_create`, con redacción de campos sensibles.
- OpenAPI en `/api/docs` fuera de producción. Rate limit global (300/min por IP), health excluido.
