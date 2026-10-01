-- scope: global — cierre de sesión.

DROP PROCEDURE IF EXISTS sp_session_revoke;

DELIMITER $$
CREATE PROCEDURE sp_session_revoke(IN p_token_hash CHAR(64))
  MODIFIES SQL DATA
BEGIN
  UPDATE user_sessions s
  JOIN user_sessions f ON f.family_uuid = s.family_uuid
  SET f.revoked_at = NOW(3)
  WHERE s.refresh_token_hash = p_token_hash AND f.revoked_at IS NULL;
END$$
DELIMITER ;
