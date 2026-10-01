-- scope: global — la sesión puede iniciarse antes del onboarding (sin tenant).

DROP PROCEDURE IF EXISTS sp_session_create;

DELIMITER $$
CREATE PROCEDURE sp_session_create(
  IN p_user_id BIGINT UNSIGNED, IN p_family_uuid CHAR(36), IN p_token_hash CHAR(64),
  IN p_remember TINYINT, IN p_ttl_days SMALLINT UNSIGNED, IN p_ip VARCHAR(45), IN p_user_agent VARCHAR(255)
)
  MODIFIES SQL DATA
BEGIN
  INSERT INTO user_sessions (tenant_id, user_id, family_uuid, refresh_token_hash, remember, expires_at, ip, user_agent)
  SELECT u.tenant_id, u.id, p_family_uuid, p_token_hash, p_remember, NOW(3) + INTERVAL p_ttl_days DAY,
         p_ip, LEFT(p_user_agent, 255)
  FROM users u WHERE u.id = p_user_id;
  SELECT uuid FROM user_sessions WHERE id = LAST_INSERT_ID();
END$$
DELIMITER ;
