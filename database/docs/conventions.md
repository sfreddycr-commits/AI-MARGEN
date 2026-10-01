# Convenciones de base de datos

Decisión de fondo: ADR-0003 (persistencia exclusiva vía stored procedures).

## Archivos

| Carpeta       | Nombre                                                       | Contenido                                 | Regla                                                    |
| ------------- | ------------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------- |
| `migrations/` | `V0001__descripcion.sql`                                     | Tablas, índices, FKs, datos de referencia | Inmutable una vez aplicada (checksum)                    |
| `routines/`   | `R__sp_nombre.sql` / `R__fn_nombre.sql` / `R__vw_nombre.sql` | Un objeto por archivo                     | `DROP ... IF EXISTS` + `CREATE`; se re-aplica al cambiar |
| `seeds/`      | por entorno                                                  | Datos demo marcados como demo (SOP §47)   | Nunca en producción                                      |

Orden de aplicación: migraciones versionadas → funciones (`fn_`) → vistas (`vw_`) → procedimientos (`sp_`).

## Nombres

- Tablas y columnas: `snake_case`, tablas en plural (`ingredients`, `recipe_items`).
- Procedimientos: `sp_<entidad>_<accion>` — `sp_ingredient_create`, `sp_ingredient_list`, `sp_ingredient_get`.
- Funciones: `fn_<nombre>`; vistas: `vw_<nombre>`.
- Parámetros de SP: prefijo `p_`; variables locales: `v_`.
- Índices: `ix_<tabla>_<columnas>`; únicos: `uq_<tabla>_<columnas>`; FKs: `fk_<tabla>_<referencia>`.

## Estructura estándar de tablas de negocio

```sql
id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,  -- interno, nunca se expone
uuid         CHAR(36) NOT NULL,                        -- identificador público
tenant_id    BIGINT UNSIGNED NOT NULL,                 -- FK a tenants
...
row_version  INT UNSIGNED NOT NULL DEFAULT 1,          -- concurrencia optimista (ADR-0007)
created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
deleted_at   DATETIME(3) NULL,                         -- archivado / tombstone para sync
created_by   BIGINT UNSIGNED NULL,                     -- FK a users
updated_by   BIGINT UNSIGNED NULL,                     -- FK a users
PRIMARY KEY (id),
UNIQUE KEY uq_<tabla>_uuid (uuid),
KEY ix_<tabla>_tenant_updated (tenant_id, updated_at), -- delta sync
CONSTRAINT fk_<tabla>_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
```

Índices adicionales compuestos que inicien con `tenant_id` según los filtros reales
(ej. `(tenant_id, status, name)`, `(tenant_id, ingredient_id, purchased_at)`).

## Reglas de stored procedures

1. Todo SP sobre datos de negocio recibe `p_tenant_id` como **primer** parámetro y filtra por él.
2. Los SP buscan por `(tenant_id, uuid)`; nunca exponen ni aceptan el `id` interno desde la API.
3. Errores de negocio: `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'` (códigos en `apps/api/src/core/db/db-error.ts`).
4. Sin fórmulas financieras: los valores calculados llegan desde el motor de cálculo.
5. Escrituras incrementan `row_version` y la versión de sync del tenant.
6. SPs globales (auth/admin) declaran `-- scope: global` con justificación.

## Verificación automática

`pnpm db:check` valida las reglas C1–C7 (ver `scripts/lib/conventions.ts`) y corre en CI.
