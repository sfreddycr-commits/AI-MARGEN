-- scope: global

DROP PROCEDURE IF EXISTS sp_auth_login_succeeded;

DELIMITER $$
CREATE PROCEDURE sp_auth_login_succeeded(IN p_user_id BIGINT UNSIGNED)
  MODIFIES SQL DATA
BEGIN
  UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW(3)
  WHERE id = p_user_id;
  UPDATE tenants t JOIN users u ON u.tenant_id = t.id
  SET t.last_activity_at = NOW(3)
  WHERE u.id = p_user_id;
END$$
DELIMITER ;
