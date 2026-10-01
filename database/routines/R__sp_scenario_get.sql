
DROP PROCEDURE IF EXISTS sp_scenario_get;

DELIMITER $$
CREATE PROCEDURE sp_scenario_get(IN p_tenant_id BIGINT UNSIGNED, IN p_uuid CHAR(36))
  READS SQL DATA
BEGIN
  SELECT * FROM vw_scenario_rows WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
END$$
DELIMITER ;
