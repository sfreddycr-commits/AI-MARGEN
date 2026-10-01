
DROP PROCEDURE IF EXISTS sp_category_changes;

DELIMITER $$
CREATE PROCEDURE sp_category_changes(
  IN p_tenant_id BIGINT UNSIGNED, IN p_kind VARCHAR(20), IN p_since DATETIME(3), IN p_since_uuid CHAR(36), IN p_limit INT UNSIGNED
)
  READS SQL DATA
BEGIN
  IF p_kind = 'ingredient' THEN
    SELECT uuid, name, row_version, updated_at, deleted_at FROM ingredient_categories
    WHERE tenant_id = p_tenant_id
      AND (p_since IS NULL OR updated_at > p_since OR (updated_at = p_since AND uuid > COALESCE(p_since_uuid, '')))
    ORDER BY updated_at, uuid LIMIT p_limit;
  ELSE
    SELECT uuid, name, row_version, updated_at, deleted_at FROM product_categories
    WHERE tenant_id = p_tenant_id
      AND (p_since IS NULL OR updated_at > p_since OR (updated_at = p_since AND uuid > COALESCE(p_since_uuid, '')))
    ORDER BY updated_at, uuid LIMIT p_limit;
  END IF;
END$$
DELIMITER ;
