
DROP PROCEDURE IF EXISTS sp_purchase_list;

DELIMITER $$
CREATE PROCEDURE sp_purchase_list(
  IN p_tenant_id BIGINT UNSIGNED, IN p_supplier_uuid CHAR(36), IN p_ingredient_uuid CHAR(36),
  IN p_from DATE, IN p_to DATE, IN p_include_void TINYINT, IN p_limit INT UNSIGNED, IN p_offset INT UNSIGNED
)
  READS SQL DATA
BEGIN
  SELECT p.uuid, p.purchased_at, p.reference, p.notes, p.total, p.source, p.voided_at, p.created_at, p.is_demo,
         s.uuid AS supplier_uuid, s.name AS supplier_name,
         (SELECT COUNT(*) FROM purchase_items pi WHERE pi.tenant_id = p.tenant_id AND pi.purchase_id = p.id) AS items_count,
         (SELECT GROUP_CONCAT(i.name ORDER BY pi.position SEPARATOR ', ')
            FROM purchase_items pi JOIN ingredients i ON i.tenant_id = pi.tenant_id AND i.id = pi.ingredient_id
           WHERE pi.tenant_id = p.tenant_id AND pi.purchase_id = p.id) AS items_summary
  FROM purchases p
  LEFT JOIN suppliers s ON s.tenant_id = p.tenant_id AND s.id = p.supplier_id
  WHERE p.tenant_id = p_tenant_id
    AND (p_supplier_uuid IS NULL OR s.uuid = p_supplier_uuid)
    AND (p_ingredient_uuid IS NULL OR EXISTS (
      SELECT 1 FROM purchase_items pi JOIN ingredients i ON i.tenant_id = pi.tenant_id AND i.id = pi.ingredient_id
      WHERE pi.tenant_id = p.tenant_id AND pi.purchase_id = p.id AND i.uuid = p_ingredient_uuid))
    AND (p_from IS NULL OR p.purchased_at >= p_from)
    AND (p_to IS NULL OR p.purchased_at <= p_to)
    AND (p_include_void = 1 OR p.voided_at IS NULL)
  ORDER BY p.purchased_at DESC, p.id DESC LIMIT p_limit OFFSET p_offset;

  SELECT COUNT(*) AS total
  FROM purchases p
  LEFT JOIN suppliers s ON s.tenant_id = p.tenant_id AND s.id = p.supplier_id
  WHERE p.tenant_id = p_tenant_id
    AND (p_supplier_uuid IS NULL OR s.uuid = p_supplier_uuid)
    AND (p_ingredient_uuid IS NULL OR EXISTS (
      SELECT 1 FROM purchase_items pi JOIN ingredients i ON i.tenant_id = pi.tenant_id AND i.id = pi.ingredient_id
      WHERE pi.tenant_id = p.tenant_id AND pi.purchase_id = p.id AND i.uuid = p_ingredient_uuid))
    AND (p_from IS NULL OR p.purchased_at >= p_from)
    AND (p_to IS NULL OR p.purchased_at <= p_to)
    AND (p_include_void = 1 OR p.voided_at IS NULL);
END$$
DELIMITER ;
