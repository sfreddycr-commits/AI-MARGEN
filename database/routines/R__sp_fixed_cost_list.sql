
DROP PROCEDURE IF EXISTS sp_fixed_cost_list;

DELIMITER $$
CREATE PROCEDURE sp_fixed_cost_list(IN p_tenant_id BIGINT UNSIGNED, IN p_archived TINYINT)
  READS SQL DATA
BEGIN
  SELECT * FROM vw_fixed_cost_rows
  WHERE tenant_id = p_tenant_id AND IF(p_archived = 1, deleted_at IS NOT NULL, deleted_at IS NULL)
  ORDER BY name;
END$$
DELIMITER ;
