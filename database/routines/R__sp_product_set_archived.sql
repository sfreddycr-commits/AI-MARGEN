
DROP PROCEDURE IF EXISTS sp_product_set_archived;

DELIMITER $$
CREATE PROCEDURE sp_product_set_archived(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36), IN p_archived TINYINT
)
  MODIFIES SQL DATA
BEGIN
  UPDATE products
  SET deleted_at = IF(p_archived = 1, COALESCE(deleted_at, NOW(3)), NULL), updated_by = p_user_id,
      row_version = row_version + 1
  WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
  IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
  CALL sp_sync_bump_version(p_tenant_id, 'products');
  SELECT * FROM vw_product_rows WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
END$$
DELIMITER ;
