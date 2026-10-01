-- scope: global — protección contra fuerza bruta.

DROP PROCEDURE IF EXISTS sp_auth_login_failed;

DELIMITER $$
CREATE PROCEDURE sp_auth_login_failed(
  IN p_user_id BIGINT UNSIGNED, IN p_max_attempts SMALLINT UNSIGNED, IN p_lock_minutes SMALLINT UNSIGNED
)
  MODIFIES SQL DATA
BEGIN
  UPDATE users
  SET locked_until = IF(failed_login_count + 1 >= p_max_attempts,
                        NOW(3) + INTERVAL p_lock_minutes MINUTE, locked_until),
      failed_login_count = IF(failed_login_count + 1 >= p_max_attempts, 0, failed_login_count + 1)
  WHERE id = p_user_id;
END$$
DELIMITER ;
