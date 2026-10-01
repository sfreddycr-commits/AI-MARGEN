# ADR-0007 — Cache local (IndexedDB/localStorage) y sincronización

- **Estado:** Aceptado — 2026-10-01 (requisito del propietario del producto)
- **Almacenes:**
  - `localStorage`: preferencias pequeñas (último módulo, vista lista/tarjetas). Nunca tokens ni datos de negocio.
  - IndexedDB (librería `idb`), base por `tenant_uuid + user_uuid`:
    - _Referencia_: tenant settings, unidades, conversiones, roles/permisos, categorías.
    - _Negocio_: ingredientes, proveedores, productos, recetas, escenarios.
- **Mecanismo de delta sync:**
  - Tabla `tenant_data_versions (tenant_id, entity, version)`; cada SP de escritura incrementa la versión.
  - Cada fila tiene `updated_at`, `deleted_at`, `row_version`.
  - `GET /sync/versions` → `sp_sync_get_versions(tenant)` (muy liviano).
  - `GET /sync/changes?entity=&since=` → `sp_sync_get_changes(tenant, entity, since)`; incluye tombstones.
- **Momentos de sincronización:**
  1. Login / apertura de app: completo la primera vez, delta después.
  2. Write-through: tras respuesta exitosa de una mutación propia, se actualiza IndexedDB de inmediato.
  3. `visibilitychange` → visible / foco: verificar versiones.
  4. Cada 60 s con la app visible: solo versiones.
  5. Evento `online`: delta.
  6. Logout / cambio de usuario o tenant: borrar la base IndexedDB completa.
- **Reglas:**
  - El cache sirve para mostrar rápido; cálculos y decisiones se confirman contra el servidor.
  - Conflictos: escritura con `row_version` esperado; si no coincide → `409` y la UI ofrece recargar.
  - Sin escrituras financieras offline (SOP §30).
