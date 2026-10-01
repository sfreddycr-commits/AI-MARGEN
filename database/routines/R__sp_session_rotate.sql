-- scope: global — rotación de refresh token con detección de reutilización (ADR-0008).
-- Reutilización de un token ya rotado hace más de 30 s → se revoca toda la familia.
-- Dentro de 30 s (dos pestañas refrescando a la vez) → ERR_CONFLICT sin revocar.
-- Vigencia: p_ttl_days con "recordarme"; máximo 7 días sin él.

DROP PROCEDURE IF EXISTS sp_session_rotate;

DELIMITER $$
CREATE PROCEDURE sp_session_rotate(
  IN p_old_hash CHAR(64), IN p_new_hash CHAR(64), IN p_ttl_days SMALLINT UNSIGNED,
  IN p_ip VARCHAR(45), IN p_user_agent VARCHAR(255)
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_user BIGINT UNSIGNED;
  DECLARE v_family CHAR(36);
  DECLARE v_remember TINYINT;
  DECLARE v_revoked DATETIME(3);
  DECLARE v_replaced BIGINT UNSIGNED;
  DECLARE v_last_used DATETIME(3);
  DECLARE v_expires DATETIME(3);
  DECLARE v_user_ok TINYINT DEFAULT 0;
  DECLARE v_new_id BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT id, user_id, family_uuid, remember, revoked_at, replaced_by_id, last_used_at, expires_at
    INTO v_id, v_user, v_family, v_remember, v_revoked, v_replaced, v_last_used, v_expires
  FROM user_sessions WHERE refresh_token_hash = p_old_hash FOR UPDATE;

  IF v_id IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND:session';
  END IF;

  IF v_replaced IS NOT NULL AND v_revoked IS NULL AND v_last_used > NOW(3) - INTERVAL 30 SECOND THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT:concurrent_refresh';
  END IF;

  IF v_revoked IS NOT NULL OR v_replaced IS NOT NULL THEN
    UPDATE user_sessions SET revoked_at = NOW(3) WHERE family_uuid = v_family AND revoked_at IS NULL;
    COMMIT;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_FORBIDDEN:token_reuse';
  END IF;

  IF v_expires <= NOW(3) THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND:session_expired';
  END IF;

  SELECT COUNT(*) INTO v_user_ok FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
  WHERE u.id = v_user AND u.status = 'active' AND u.deleted_at IS NULL
    AND (t.id IS NULL OR t.status = 'active');
  IF v_user_ok = 0 THEN
    UPDATE user_sessions SET revoked_at = NOW(3) WHERE family_uuid = v_family AND revoked_at IS NULL;
    COMMIT;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_FORBIDDEN:inactive';
  END IF;

  INSERT INTO user_sessions (tenant_id, user_id, family_uuid, refresh_token_hash, remember, expires_at, ip, user_agent)
  SELECT u.tenant_id, u.id, v_family, p_new_hash, v_remember,
         NOW(3) + INTERVAL IF(v_remember = 1, p_ttl_days, LEAST(p_ttl_days, 7)) DAY, p_ip, LEFT(p_user_agent, 255)
  FROM users u WHERE u.id = v_user;
  SET v_new_id = LAST_INSERT_ID();
  UPDATE user_sessions SET replaced_by_id = v_new_id, last_used_at = NOW(3) WHERE id = v_id;
  COMMIT;

  SELECT v_user AS user_id, v_remember AS remember;
END$$
DELIMITER ;
