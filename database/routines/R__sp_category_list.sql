
DROP PROCEDURE IF EXISTS sp_category_list;

DELIMITER $$
CREATE PROCEDURE sp_category_list(IN p_tenant_id BIGINT UNSIGNED, IN p_kind VARCHAR(20))
  READS SQL DATA
BEGIN
  IF p_kind = 'ingredient' THEN
    SELECT uuid, name, row_version, updated_at, deleted_at FROM ingredient_categories
    WHERE tenant_id = p_tenant_id AND deleted_at IS NULL ORDER BY name;
  ELSE
    SELECT uuid, name, row_version, updated_at, deleted_at FROM product_categories
    WHERE tenant_id = p_tenant_id AND deleted_at IS NULL ORDER BY name;
  END IF;
END$$
DELIMITER ;
