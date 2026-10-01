# ADR-0003 — Persistencia exclusiva mediante Stored Procedures

- **Estado:** Aceptado — 2026-10-01 (requisito del propietario del producto)
- **Contexto:** El propietario exige que toda interacción con MySQL sea vía stored procedures.
  El SOP exige que las fórmulas financieras vivan en un único motor de cálculo.
- **Decisión:**
  - Toda lectura/escritura usa `CALL sp_*`. No hay SQL ad-hoc en la aplicación.
  - Prefijos: `sp_` procedimientos, `fn_` funciones, `vw_` vistas.
    Nombre: `sp_<entidad>_<accion>` (ej. `sp_ingredient_create`, `sp_ingredient_list`).
  - Los SP de datos de negocio reciben `p_tenant_id` como **primer** parámetro y filtran por él.
  - Los SP **no** contienen fórmulas financieras (costo, margen, precio, equilibrio).
    Si deben persistir un valor calculado, lo reciben ya calculado por el controlador
    usando `packages/calculation-engine`.
  - Los SP sí se encargan de: integridad, filtros, paginación, historial, auditoría, versiones de sync.
  - Errores de negocio desde SP con `SIGNAL SQLSTATE '45000'` + `MESSAGE_TEXT` con código estable
    (ej. `ERR_NOT_FOUND`, `ERR_CONFLICT`), traducido a español por la API.
  - Driver: `mysql2/promise` con parámetros (`CALL sp_x(?, ?, ...)`), nunca concatenación.
  - Los SP/funciones/vistas se versionan como migraciones (`DROP ... IF EXISTS` + `CREATE`).
- **Consecuencias:**
  - El modelo de la API es una capa delgada: recibe datos y llama al SP.
  - No se usa ORM ni query builder (descarta Kysely propuesto inicialmente).
  - Las pruebas de integración ejercen los SP contra MySQL real.
