# Handoff — Etapa 1: Fundación

```text
ETAPA:          1 — Fundación
ESTADO:         COMPLETADA (gate "web + API + DB operativos": PASS)
BRANCH:         main
COMMIT/SHA:     ver `git log` (commit "Etapa 1: fundación")
```

## Implementado

**Base de datos** (V0002, V0003 + 3 SPs)

- Tablas: `plans`, `tenants`, `subscriptions`, `roles`, `permissions`, `role_permissions`, `users`,
  `user_sessions`, `tenant_settings`, `tenant_data_versions`, `feature_flags`, `tenant_feature_flags`, `audit_logs`.
  PK, FK, índices que inician con `tenant_id`, `CHECK` de moneda/país/margen/escala, UUID por defecto.
- Datos de referencia: 6 roles del SOP, 24 permisos, matriz rol-permiso, plan "Inicial" (sin precios), 5 feature flags.
- SPs: `sp_audit_log_create` (auditoría solo-inserción), `sp_sync_bump_version`, `sp_sync_get_versions`.
- `db:migrate` se niega a aplicar si `db:check` (C1–C7) falla.

**API**

- Métricas Prometheus (`/api/v1/metrics`, protegidas por token), contador de errores por tipo.
- OpenAPI en `/api/docs` (desactivado en producción). Rate limit global con respuesta en español.
- Contexto de solicitud (`req.ctx`) y servicio de auditoría con redacción de secretos.

**Web**

- Design system con tokens, Inter variable autoalojada (con `cv08`), componentes: Button, TextField/NumberField,
  Sheet (bottom sheet / panel lateral), Skeleton, EmptyState, StatusBadge, Notice, Toast, Icon, **MarginBar**.
- Formato CR (`₡1.666,67`) y lectura tolerante de montos (`10.000`, `1.500,75`, `2,5`).
- Shell: sidebar desktop + barra inferior móvil + vista "Más", aviso sin conexión, safe areas,
  navegación por etapas (producción solo muestra módulos listos).
- PWA: manifest, íconos (incl. maskable y Apple), service worker con shell offline, aviso de actualización.
- IndexedDB por tenant+usuario, motor de sincronización (versiones + cursor, write-through, 5 disparadores),
  limpieza total al cerrar sesión, preferencias en localStorage sin datos sensibles.

## Pruebas ejecutadas

| Gate                                                                                         | Resultado    |
| -------------------------------------------------------------------------------------------- | ------------ |
| format / lint / typecheck                                                                    | PASS         |
| unit                                                                                         | PASS — 70/70 |
| db:check + migraciones limpias + idempotentes                                                | PASS         |
| integration (MySQL real)                                                                     | PASS — 35/35 |
| build (api + web + PWA)                                                                      | PASS         |
| audit prod high/critical                                                                     | PASS — 0     |
| E2E 390×844 + 1440×900 (shell, navegación, sin overflow, targets ≥ 44 px, manifest, offline) | PASS — 12/12 |

## Bugs encontrados y corregidos durante la etapa

- `REGEXP` de moneda aceptaba minúsculas por la collation `_ai_ci` → `REGEXP_LIKE(..., 'c')` y nota en convenciones.
- Errores de plugins registrados antes del manejador central no salían en español → manejador primero.
- Fuente de fontsource sin features OpenType ("AImargen" se leía "Almargen") → Inter autoalojada con `cv08`.
- En CI (`NODE_ENV=test`) Vite generaba un bundle de desarrollo (sin service worker y con el catálogo
  de componentes) → `vite build` fuerza `NODE_ENV=production`. Detectado por el E2E en CI.

## Bugs abiertos

Ninguno.

## Riesgos / notas

- El isotipo (barras costo | margen) es provisional; si existe un logo oficial, se reemplaza en `scripts/generate-icons.mjs`.
- En producción, hasta la Etapa 3 la barra inferior solo muestra "Más"; los módulos aparecen al cumplir su gate.
- `/sync` en la API se expone en Etapa 3 (requiere sesión); el motor de sync del cliente ya está probado con un transporte falso.

## Siguiente etapa

Etapa 2 — Landing: página pública completa, responsive, SEO (metadata, Open Graph, sitemap, robots),
páginas legales y Lighthouse.
