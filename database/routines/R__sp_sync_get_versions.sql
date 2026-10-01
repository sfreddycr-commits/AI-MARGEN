-- sp_sync_get_versions
-- Devuelve la versión de cada entidad del tenant. Consulta liviana usada por la web
-- para decidir si debe descargar cambios (ADR-0007).

DROP PROCEDURE IF EXISTS sp_sync_get_versions;

DELIMITER $$
CREATE PROCEDURE sp_sync_get_versions(
  IN p_tenant_id BIGINT UNSIGNED
)
  READS SQL DATA
BEGIN
  SELECT entity, version, updated_at
  FROM tenant_data_versions
  WHERE tenant_id = p_tenant_id
  ORDER BY entity;
END$$
DELIMITER ;
