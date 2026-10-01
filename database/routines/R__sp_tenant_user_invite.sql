
DROP PROCEDURE IF EXISTS sp_tenant_user_invite;

DELIMITER $$
CREATE PROCEDURE sp_tenant_user_invite(
  IN p_tenant_id BIGINT UNSIGNED, IN p_name VARCHAR(120), IN p_email VARCHAR(190),
  IN p_role VARCHAR(40), IN p_password_hash VARCHAR(255)
)
  MODIFIES SQL DATA
BEGIN
  IF p_role NOT IN ('tenant_admin', 'manager', 'operator', 'viewer') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:role';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_DUPLICATE:email';
  END IF;
  INSERT INTO users (tenant_id, name, email, password_hash, role_id, status)
  VALUES (p_tenant_id, p_name, p_email, p_password_hash, fn_role_id(p_role), 'invited');
  SELECT id, uuid FROM users WHERE id = LAST_INSERT_ID();
END$$
DELIMITER ;
