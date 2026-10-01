
DROP PROCEDURE IF EXISTS sp_scenario_list;

DELIMITER $$
CREATE PROCEDURE sp_scenario_list(IN p_tenant_id BIGINT UNSIGNED, IN p_archived TINYINT)
  READS SQL DATA
BEGIN
  SELECT * FROM vw_scenario_rows
  WHERE tenant_id = p_tenant_id AND IF(p_archived = 1, deleted_at IS NOT NULL, deleted_at IS NULL)
  ORDER BY updated_at DESC;
END$$
DELIMITER ;
