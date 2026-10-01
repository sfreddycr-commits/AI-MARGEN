
DROP PROCEDURE IF EXISTS sp_export_log;

DELIMITER $$
CREATE PROCEDURE sp_export_log(IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_report VARCHAR(40), IN p_format VARCHAR(10))
  MODIFIES SQL DATA
BEGIN
  INSERT INTO exports (tenant_id, user_id, report, format) VALUES (p_tenant_id, p_user_id, p_report, p_format);
END$$
DELIMITER ;
