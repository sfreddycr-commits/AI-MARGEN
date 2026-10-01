
DROP PROCEDURE IF EXISTS sp_category_update;

DELIMITER $$
CREATE PROCEDURE sp_category_update(
  IN p_tenant_id BIGINT UNSIGNED, IN p_kind VARCHAR(20), IN p_uuid CHAR(36), IN p_name VARCHAR(80), IN p_archived TINYINT
)
  MODIFIES SQL DATA
BEGIN
  IF p_kind = 'ingredient' THEN
    UPDATE ingredient_categories
    SET name = p_name, deleted_at = IF(p_archived = 1, COALESCE(deleted_at, NOW(3)), NULL), row_version = row_version + 1
    WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
    IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
    CALL sp_sync_bump_version(p_tenant_id, 'ingredient_categories');
    SELECT uuid, name, row_version, updated_at, deleted_at FROM ingredient_categories WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
  ELSE
    UPDATE product_categories
    SET name = p_name, deleted_at = IF(p_archived = 1, COALESCE(deleted_at, NOW(3)), NULL), row_version = row_version + 1
    WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
    IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
    CALL sp_sync_bump_version(p_tenant_id, 'product_categories');
    SELECT uuid, name, row_version, updated_at, deleted_at FROM product_categories WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
  END IF;
END$$
DELIMITER ;
