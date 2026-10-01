-- scope: global — revoca todas las sesiones de un usuario (bloqueo, cambio de contraseña).

DROP PROCEDURE IF EXISTS sp_session_revoke_user;

DELIMITER $$
CREATE PROCEDURE sp_session_revoke_user(IN p_user_id BIGINT UNSIGNED)
  MODIFIES SQL DATA
BEGIN
  UPDATE user_sessions SET revoked_at = NOW(3) WHERE user_id = p_user_id AND revoked_at IS NULL;
END$$
DELIMITER ;
