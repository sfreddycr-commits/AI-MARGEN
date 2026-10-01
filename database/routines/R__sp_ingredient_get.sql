
DROP PROCEDURE IF EXISTS sp_ingredient_get;

DELIMITER $$
CREATE PROCEDURE sp_ingredient_get(IN p_tenant_id BIGINT UNSIGNED, IN p_uuid CHAR(36))
  READS SQL DATA
BEGIN
  SELECT * FROM vw_ingredient_rows WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
END$$
DELIMITER ;
