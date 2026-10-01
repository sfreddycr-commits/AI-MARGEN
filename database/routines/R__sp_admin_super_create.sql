-- scope: global — crea un super_admin (solo desde la CLI de la API, nunca expuesto por HTTP).

DROP PROCEDURE IF EXISTS sp_admin_super_create;

DELIMITER $$
CREATE PROCEDURE sp_admin_super_create(IN p_name VARCHAR(120), IN p_email VARCHAR(190), IN p_password_hash VARCHAR(255))
  MODIFIES SQL DATA
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_DUPLICATE:email';
  END IF;
  INSERT INTO users (tenant_id, name, email, password_hash, role_id, status, email_verified_at)
  VALUES (NULL, p_name, p_email, p_password_hash, fn_role_id('super_admin'), 'active', NOW(3));
  SELECT uuid FROM users WHERE id = LAST_INSERT_ID();
END$$
DELIMITER ;
