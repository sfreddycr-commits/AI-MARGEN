-- p_filter: active | archived | no_price | incomplete

DROP PROCEDURE IF EXISTS sp_product_list;

DELIMITER $$
CREATE PROCEDURE sp_product_list(
  IN p_tenant_id BIGINT UNSIGNED, IN p_search VARCHAR(120), IN p_category_uuid CHAR(36),
  IN p_filter VARCHAR(20), IN p_limit INT UNSIGNED, IN p_offset INT UNSIGNED
)
  READS SQL DATA
BEGIN
  SELECT * FROM vw_product_rows
  WHERE tenant_id = p_tenant_id
    AND (p_search IS NULL OR name LIKE CONCAT('%', p_search, '%'))
    AND (p_category_uuid IS NULL OR category_uuid = p_category_uuid)
    AND CASE p_filter
          WHEN 'archived' THEN deleted_at IS NOT NULL
          WHEN 'no_price' THEN deleted_at IS NULL AND (current_price IS NULL OR current_price = 0)
          WHEN 'incomplete' THEN deleted_at IS NULL AND cost_complete = 0
          ELSE deleted_at IS NULL END
  ORDER BY name LIMIT p_limit OFFSET p_offset;
  SELECT COUNT(*) AS total FROM vw_product_rows
  WHERE tenant_id = p_tenant_id
    AND (p_search IS NULL OR name LIKE CONCAT('%', p_search, '%'))
    AND (p_category_uuid IS NULL OR category_uuid = p_category_uuid)
    AND CASE p_filter
          WHEN 'archived' THEN deleted_at IS NOT NULL
          WHEN 'no_price' THEN deleted_at IS NULL AND (current_price IS NULL OR current_price = 0)
          WHEN 'incomplete' THEN deleted_at IS NULL AND cost_complete = 0
          ELSE deleted_at IS NULL END;
END$$
DELIMITER ;
