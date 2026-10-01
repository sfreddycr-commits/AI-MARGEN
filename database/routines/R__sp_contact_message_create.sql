-- scope: global — formulario público de contacto.

DROP PROCEDURE IF EXISTS sp_contact_message_create;

DELIMITER $$
CREATE PROCEDURE sp_contact_message_create(
  IN p_name VARCHAR(120), IN p_email VARCHAR(190), IN p_business VARCHAR(120), IN p_message VARCHAR(2000), IN p_ip VARCHAR(45)
)
  MODIFIES SQL DATA
BEGIN
  INSERT INTO contact_messages (name, email, business, message, ip) VALUES (p_name, p_email, p_business, p_message, p_ip);
END$$
DELIMITER ;
