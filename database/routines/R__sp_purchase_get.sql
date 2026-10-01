
DROP PROCEDURE IF EXISTS sp_purchase_get;

DELIMITER $$
CREATE PROCEDURE sp_purchase_get(IN p_tenant_id BIGINT UNSIGNED, IN p_uuid CHAR(36))
  READS SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  SELECT id INTO v_id FROM purchases WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
  IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;

  SELECT p.uuid, p.purchased_at, p.reference, p.notes, p.total, p.source, p.voided_at, p.created_at, p.is_demo,
         s.uuid AS supplier_uuid, s.name AS supplier_name, d.uuid AS document_uuid
  FROM purchases p
  LEFT JOIN suppliers s ON s.tenant_id = p.tenant_id AND s.id = p.supplier_id
  LEFT JOIN uploaded_documents d ON d.tenant_id = p.tenant_id AND d.id = p.document_id
  WHERE p.id = v_id;

  SELECT i.uuid AS ingredient_uuid, i.name AS ingredient_name, iu.code AS ingredient_unit,
         pi.quantity, u.code AS unit, pi.line_total, pi.unit_cost
  FROM purchase_items pi
  JOIN ingredients i ON i.tenant_id = pi.tenant_id AND i.id = pi.ingredient_id
  JOIN units iu ON iu.id = i.unit_id
  JOIN units u ON u.id = pi.unit_id
  WHERE pi.tenant_id = p_tenant_id AND pi.purchase_id = v_id
  ORDER BY pi.position;
END$$
DELIMITER ;
