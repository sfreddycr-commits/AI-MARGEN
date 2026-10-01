-- scope: global — el registro ocurre antes de existir un tenant (ADR-0008).

DROP PROCEDURE IF EXISTS sp_auth_user_create;

DELIMITER $$
CREATE PROCEDURE sp_auth_user_create(
  IN p_name VARCHAR(120), IN p_email VARCHAR(190), IN p_password_hash VARCHAR(255)
)
  MODIFIES SQL DATA
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_DUPLICATE:email';
  END IF;
  INSERT INTO users (tenant_id, name, email, password_hash, role_id, status)
  VALUES (NULL, p_name, p_email, p_password_hash, fn_role_id('tenant_owner'), 'active');
  SELECT id, uuid FROM users WHERE id = LAST_INSERT_ID();
END$$
DELIMITER ;
