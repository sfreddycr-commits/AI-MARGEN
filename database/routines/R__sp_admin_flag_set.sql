-- scope: global — p_enabled NULL elimina la excepción y vuelve al valor por defecto.

DROP PROCEDURE IF EXISTS sp_admin_flag_set;

DELIMITER $$
CREATE PROCEDURE sp_admin_flag_set(IN p_tenant_uuid CHAR(36), IN p_code VARCHAR(60), IN p_enabled TINYINT)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_tenant BIGINT UNSIGNED;
  DECLARE v_flag SMALLINT UNSIGNED;
  SELECT id INTO v_tenant FROM tenants WHERE uuid = p_tenant_uuid;
  SELECT id INTO v_flag FROM feature_flags WHERE code = p_code;
  IF v_tenant IS NULL OR v_flag IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
  IF p_enabled IS NULL THEN
    DELETE FROM tenant_feature_flags WHERE tenant_id = v_tenant AND flag_id = v_flag;
  ELSE
    INSERT INTO tenant_feature_flags (tenant_id, flag_id, enabled) VALUES (v_tenant, v_flag, p_enabled)
    ON DUPLICATE KEY UPDATE enabled = VALUES(enabled);
  END IF;
  SELECT v_tenant AS tenant_id;
END$$
DELIMITER ;
