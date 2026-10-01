-- scope: global — tokens de verificación / recuperación / invitación (se guarda solo el hash).

DROP PROCEDURE IF EXISTS sp_auth_token_create;

DELIMITER $$
CREATE PROCEDURE sp_auth_token_create(
  IN p_user_id BIGINT UNSIGNED, IN p_purpose VARCHAR(20), IN p_token_hash CHAR(64), IN p_ttl_minutes INT UNSIGNED
)
  MODIFIES SQL DATA
BEGIN
  UPDATE user_tokens SET used_at = NOW(3)
  WHERE user_id = p_user_id AND purpose = p_purpose AND used_at IS NULL;
  INSERT INTO user_tokens (user_id, purpose, token_hash, expires_at)
  VALUES (p_user_id, p_purpose, p_token_hash, NOW(3) + INTERVAL p_ttl_minutes MINUTE);
END$$
DELIMITER ;
