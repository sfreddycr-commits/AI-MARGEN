
DROP PROCEDURE IF EXISTS sp_tenant_settings_update;

DELIMITER $$
CREATE PROCEDURE sp_tenant_settings_update(
  IN p_tenant_id BIGINT UNSIGNED, IN p_target_margin DECIMAL(9,6), IN p_days TINYINT UNSIGNED,
  IN p_rounding_scale TINYINT UNSIGNED, IN p_cost_method VARCHAR(20), IN p_row_version INT UNSIGNED
)
  MODIFIES SQL DATA
BEGIN
  UPDATE tenant_settings
  SET default_target_margin = p_target_margin, operating_days_per_month = p_days,
      rounding_scale = p_rounding_scale, cost_method = p_cost_method, row_version = row_version + 1
  WHERE tenant_id = p_tenant_id AND row_version = p_row_version;
  IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT'; END IF;
  CALL sp_sync_bump_version(p_tenant_id, 'settings');
END$$
DELIMITER ;
