-- Datos para el motor de cálculo de una lista de ingredientes activos: [ "uuid", ... ]

DROP PROCEDURE IF EXISTS sp_ingredient_resolve;

DELIMITER $$
CREATE PROCEDURE sp_ingredient_resolve(IN p_tenant_id BIGINT UNSIGNED, IN p_uuids JSON)
  READS SQL DATA
BEGIN
  SELECT r.id, r.uuid, r.name, r.unit, r.current_unit_cost, r.yield_fraction, r.conversions, r.deleted_at
  FROM vw_ingredient_rows r
  JOIN JSON_TABLE(p_uuids, '$[*]' COLUMNS (u CHAR(36) COLLATE utf8mb4_0900_ai_ci PATH '$')) j ON j.u = r.uuid
  WHERE r.tenant_id = p_tenant_id;
END$$
DELIMITER ;
