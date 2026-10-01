-- scope: global — consume un token válido y no vencido; un solo uso.

DROP PROCEDURE IF EXISTS sp_auth_token_consume;

DELIMITER $$
CREATE PROCEDURE sp_auth_token_consume(IN p_token_hash CHAR(64), IN p_purpose VARCHAR(20))
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_user BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT id, user_id INTO v_id, v_user FROM user_tokens
  WHERE token_hash = p_token_hash AND purpose = p_purpose AND used_at IS NULL AND expires_at > NOW(3)
  FOR UPDATE;
  IF v_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND:token';
  END IF;
  UPDATE user_tokens SET used_at = NOW(3) WHERE id = v_id;
  COMMIT;
  SELECT u.id, u.uuid, u.email, u.name, u.status FROM users u WHERE u.id = v_user;
END$$
DELIMITER ;
