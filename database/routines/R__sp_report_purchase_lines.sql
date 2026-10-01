
DROP PROCEDURE IF EXISTS sp_report_purchase_lines;

DELIMITER $$
CREATE PROCEDURE sp_report_purchase_lines(IN p_tenant_id BIGINT UNSIGNED, IN p_from DATE, IN p_to DATE)
  READS SQL DATA
BEGIN
  SELECT p.uuid AS purchase_uuid, p.purchased_at, p.reference, s.name AS supplier_name,
         i.name AS ingredient_name, pi.quantity, u.code AS unit, pi.line_total, pi.unit_cost, iu.code AS ingredient_unit
  FROM purchases p
  JOIN purchase_items pi ON pi.tenant_id = p.tenant_id AND pi.purchase_id = p.id
  JOIN ingredients i ON i.tenant_id = pi.tenant_id AND i.id = pi.ingredient_id
  JOIN units u ON u.id = pi.unit_id
  JOIN units iu ON iu.id = i.unit_id
  LEFT JOIN suppliers s ON s.tenant_id = p.tenant_id AND s.id = p.supplier_id
  WHERE p.tenant_id = p_tenant_id AND p.voided_at IS NULL
    AND (p_from IS NULL OR p.purchased_at >= p_from) AND (p_to IS NULL OR p.purchased_at <= p_to)
  ORDER BY p.purchased_at DESC, p.id DESC, pi.position;
END$$
DELIMITER ;
