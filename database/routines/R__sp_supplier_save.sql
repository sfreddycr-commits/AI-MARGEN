-- Crea (p_uuid NULL) o actualiza un proveedor con control de concurrencia.

DROP PROCEDURE IF EXISTS sp_supplier_save;

DELIMITER $$
CREATE PROCEDURE sp_supplier_save(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36),
  IN p_name VARCHAR(120), IN p_contact VARCHAR(120), IN p_phone VARCHAR(30), IN p_email VARCHAR(190),
  IN p_notes VARCHAR(500), IN p_row_version INT UNSIGNED, IN p_is_demo TINYINT
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  IF p_uuid IS NULL THEN
    INSERT INTO suppliers (tenant_id, name, contact_name, phone, email, notes, is_demo, created_by, updated_by)
    VALUES (p_tenant_id, p_name, p_contact, p_phone, p_email, p_notes, COALESCE(p_is_demo, 0), p_user_id, p_user_id);
    SET v_id = LAST_INSERT_ID();
  ELSE
    SELECT id INTO v_id FROM suppliers WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
    IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
    UPDATE suppliers
    SET name = p_name, contact_name = p_contact, phone = p_phone, email = p_email, notes = p_notes,
        updated_by = p_user_id, row_version = row_version + 1
    WHERE id = v_id AND row_version = p_row_version;
    IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT'; END IF;
  END IF;
  CALL sp_sync_bump_version(p_tenant_id, 'suppliers');
  SELECT * FROM vw_supplier_rows WHERE id = v_id;
END$$
DELIMITER ;
