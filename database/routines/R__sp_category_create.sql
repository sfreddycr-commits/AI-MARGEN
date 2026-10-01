
DROP PROCEDURE IF EXISTS sp_category_create;

DELIMITER $$
CREATE PROCEDURE sp_category_create(IN p_tenant_id BIGINT UNSIGNED, IN p_kind VARCHAR(20), IN p_name VARCHAR(80))
  MODIFIES SQL DATA
BEGIN
  IF p_kind = 'ingredient' THEN
    INSERT INTO ingredient_categories (tenant_id, name) VALUES (p_tenant_id, p_name);
    CALL sp_sync_bump_version(p_tenant_id, 'ingredient_categories');
    SELECT uuid, name, row_version, updated_at, deleted_at FROM ingredient_categories WHERE id = LAST_INSERT_ID();
  ELSE
    INSERT INTO product_categories (tenant_id, name) VALUES (p_tenant_id, p_name);
    CALL sp_sync_bump_version(p_tenant_id, 'product_categories');
    SELECT uuid, name, row_version, updated_at, deleted_at FROM product_categories WHERE id = LAST_INSERT_ID();
  END IF;
END$$
DELIMITER ;
