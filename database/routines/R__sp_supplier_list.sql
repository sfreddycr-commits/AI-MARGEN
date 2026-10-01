
DROP PROCEDURE IF EXISTS sp_supplier_list;

DELIMITER $$
CREATE PROCEDURE sp_supplier_list(
  IN p_tenant_id BIGINT UNSIGNED, IN p_search VARCHAR(120), IN p_archived TINYINT, IN p_limit INT UNSIGNED, IN p_offset INT UNSIGNED
)
  READS SQL DATA
BEGIN
  SELECT * FROM vw_supplier_rows
  WHERE tenant_id = p_tenant_id
    AND (p_search IS NULL OR name LIKE CONCAT('%', p_search, '%') OR contact_name LIKE CONCAT('%', p_search, '%'))
    AND IF(p_archived = 1, deleted_at IS NOT NULL, deleted_at IS NULL)
  ORDER BY name LIMIT p_limit OFFSET p_offset;
  SELECT COUNT(*) AS total FROM suppliers
  WHERE tenant_id = p_tenant_id
    AND (p_search IS NULL OR name LIKE CONCAT('%', p_search, '%') OR contact_name LIKE CONCAT('%', p_search, '%'))
    AND IF(p_archived = 1, deleted_at IS NOT NULL, deleted_at IS NULL);
END$$
DELIMITER ;
