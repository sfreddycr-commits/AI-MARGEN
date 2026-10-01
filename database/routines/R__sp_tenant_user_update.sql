-- No permite modificar al propietario ni asignar roles de plataforma o de propietario.

DROP PROCEDURE IF EXISTS sp_tenant_user_update;

DELIMITER $$
CREATE PROCEDURE sp_tenant_user_update(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_uuid CHAR(36), IN p_role VARCHAR(40), IN p_status VARCHAR(20)
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_role VARCHAR(40);
  DECLARE v_before JSON;
  SELECT u.id, r.code, JSON_OBJECT('role', r.code, 'status', u.status) INTO v_id, v_role, v_before
  FROM users u JOIN roles r ON r.id = u.role_id
  WHERE u.tenant_id = p_tenant_id AND u.uuid = p_user_uuid AND u.deleted_at IS NULL;
  IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
  IF v_role = 'tenant_owner' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_FORBIDDEN:owner'; END IF;
  IF p_role NOT IN ('tenant_admin', 'manager', 'operator', 'viewer') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:role';
  END IF;
  IF p_status NOT IN ('active', 'blocked', 'invited') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:status';
  END IF;
  UPDATE users SET role_id = fn_role_id(p_role), status = p_status, row_version = row_version + 1
  WHERE id = v_id;
  IF p_status = 'blocked' THEN
    UPDATE user_sessions SET revoked_at = NOW(3) WHERE user_id = v_id AND revoked_at IS NULL;
  END IF;
  SELECT v_id AS id, v_before AS before_json;
END$$
DELIMITER ;
