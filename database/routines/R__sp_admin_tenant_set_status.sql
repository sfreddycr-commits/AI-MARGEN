-- scope: global — suspender revoca todas las sesiones del negocio.

DROP PROCEDURE IF EXISTS sp_admin_tenant_set_status;

DELIMITER $$
CREATE PROCEDURE sp_admin_tenant_set_status(IN p_uuid CHAR(36), IN p_status VARCHAR(20))
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_before VARCHAR(20);
  SELECT id, status INTO v_id, v_before FROM tenants WHERE uuid = p_uuid;
  IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
  IF p_status NOT IN ('active', 'suspended') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:status'; END IF;
  UPDATE tenants SET status = p_status, row_version = row_version + 1 WHERE id = v_id;
  IF p_status = 'suspended' THEN
    UPDATE user_sessions SET revoked_at = NOW(3) WHERE tenant_id = v_id AND revoked_at IS NULL;
  END IF;
  SELECT v_id AS id, v_before AS before_status;
END$$
DELIMITER ;
