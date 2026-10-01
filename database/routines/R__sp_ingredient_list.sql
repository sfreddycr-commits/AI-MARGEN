-- p_filter: active | archived | missing_cost

DROP PROCEDURE IF EXISTS sp_ingredient_list;

DELIMITER $$
CREATE PROCEDURE sp_ingredient_list(
  IN p_tenant_id BIGINT UNSIGNED, IN p_search VARCHAR(120), IN p_category_uuid CHAR(36),
  IN p_filter VARCHAR(20), IN p_limit INT UNSIGNED, IN p_offset INT UNSIGNED
)
  READS SQL DATA
BEGIN
  SELECT * FROM vw_ingredient_rows
  WHERE tenant_id = p_tenant_id
    AND (p_search IS NULL OR name LIKE CONCAT('%', p_search, '%'))
    AND (p_category_uuid IS NULL OR category_uuid = p_category_uuid)
    AND CASE p_filter
          WHEN 'archived' THEN deleted_at IS NOT NULL
          WHEN 'missing_cost' THEN deleted_at IS NULL AND current_unit_cost IS NULL
          ELSE deleted_at IS NULL END
  ORDER BY name LIMIT p_limit OFFSET p_offset;
  SELECT COUNT(*) AS total FROM vw_ingredient_rows
  WHERE tenant_id = p_tenant_id
    AND (p_search IS NULL OR name LIKE CONCAT('%', p_search, '%'))
    AND (p_category_uuid IS NULL OR category_uuid = p_category_uuid)
    AND CASE p_filter
          WHEN 'archived' THEN deleted_at IS NOT NULL
          WHEN 'missing_cost' THEN deleted_at IS NULL AND current_unit_cost IS NULL
          ELSE deleted_at IS NULL END;
END$$
DELIMITER ;
