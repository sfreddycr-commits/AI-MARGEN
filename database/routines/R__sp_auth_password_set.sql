-- scope: global — cambio/recuperación de contraseña; revoca todas las sesiones del usuario.

DROP PROCEDURE IF EXISTS sp_auth_password_set;

DELIMITER $$
CREATE PROCEDURE sp_auth_password_set(IN p_user_id BIGINT UNSIGNED, IN p_password_hash VARCHAR(255))
  MODIFIES SQL DATA
BEGIN
  UPDATE users
  SET password_hash = p_password_hash, failed_login_count = 0, locked_until = NULL,
      email_verified_at = COALESCE(email_verified_at, NOW(3)),
      status = IF(status = 'invited', 'active', status), row_version = row_version + 1
  WHERE id = p_user_id;
  UPDATE user_sessions SET revoked_at = NOW(3) WHERE user_id = p_user_id AND revoked_at IS NULL;
END$$
DELIMITER ;
