-- Fija el costo vigente calculado por el motor (promedio ponderado).

DROP PROCEDURE IF EXISTS sp_ingredient_current_cost_set;

DELIMITER $$
CREATE PROCEDURE sp_ingredient_current_cost_set(IN p_tenant_id BIGINT UNSIGNED, IN p_costs JSON)
  MODIFIES SQL DATA
BEGIN
  UPDATE ingredients i
  JOIN JSON_TABLE(p_costs, '$[*]' COLUMNS (id BIGINT UNSIGNED PATH '$.id', cost DECIMAL(18,6) PATH '$.cost')) j ON j.id = i.id
  SET i.current_unit_cost = j.cost, i.row_version = i.row_version + 1
  WHERE i.tenant_id = p_tenant_id;
  CALL sp_sync_bump_version(p_tenant_id, 'ingredients');
END$$
DELIMITER ;
