-- scope: global

DROP PROCEDURE IF EXISTS sp_auth_email_verify;

DELIMITER $$
CREATE PROCEDURE sp_auth_email_verify(IN p_user_id BIGINT UNSIGNED)
  MODIFIES SQL DATA
BEGIN
  UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW(3)), row_version = row_version + 1
  WHERE id = p_user_id;
END$$
DELIMITER ;
