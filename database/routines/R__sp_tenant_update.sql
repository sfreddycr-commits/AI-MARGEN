
DROP PROCEDURE IF EXISTS sp_tenant_update;

DELIMITER $$
CREATE PROCEDURE sp_tenant_update(
  IN p_tenant_id BIGINT UNSIGNED, IN p_name VARCHAR(120), IN p_legal_name VARCHAR(160),
  IN p_email VARCHAR(190), IN p_phone VARCHAR(30), IN p_business_type VARCHAR(20),
  IN p_country CHAR(2), IN p_currency CHAR(3), IN p_timezone VARCHAR(64), IN p_row_version INT UNSIGNED
)
  MODIFIES SQL DATA
BEGIN
  UPDATE tenants
  SET name = p_name, legal_name = p_legal_name, email = p_email, phone = p_phone,
      business_type = p_business_type, country = p_country, currency = p_currency,
      timezone = p_timezone, row_version = row_version + 1
  WHERE id = p_tenant_id AND row_version = p_row_version;
  IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT'; END IF;
  CALL sp_sync_bump_version(p_tenant_id, 'settings');
END$$
DELIMITER ;
