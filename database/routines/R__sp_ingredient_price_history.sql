
DROP PROCEDURE IF EXISTS sp_ingredient_price_history;

DELIMITER $$
CREATE PROCEDURE sp_ingredient_price_history(IN p_tenant_id BIGINT UNSIGNED, IN p_uuid CHAR(36), IN p_limit INT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT h.effective_at, h.unit_cost, h.quantity, h.source, h.voided_at,
         s.uuid AS supplier_uuid, s.name AS supplier_name, p.uuid AS purchase_uuid
  FROM ingredient_price_history h
  JOIN ingredients i ON i.tenant_id = h.tenant_id AND i.id = h.ingredient_id
  LEFT JOIN suppliers s ON s.tenant_id = h.tenant_id AND s.id = h.supplier_id
  LEFT JOIN purchase_items pi ON pi.tenant_id = h.tenant_id AND pi.id = h.purchase_item_id
  LEFT JOIN purchases p ON p.tenant_id = pi.tenant_id AND p.id = pi.purchase_id
  WHERE h.tenant_id = p_tenant_id AND i.uuid = p_uuid
  ORDER BY h.effective_at DESC, h.id DESC LIMIT p_limit;
END$$
DELIMITER ;
