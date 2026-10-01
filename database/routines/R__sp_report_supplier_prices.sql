-- Costos por ingrediente y proveedor en una ventana de días (comparativo de proveedores).

DROP PROCEDURE IF EXISTS sp_report_supplier_prices;

DELIMITER $$
CREATE PROCEDURE sp_report_supplier_prices(IN p_tenant_id BIGINT UNSIGNED, IN p_ingredient_uuid CHAR(36), IN p_days SMALLINT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT i.uuid AS ingredient_uuid, i.name AS ingredient_name, u.code AS unit,
         s.uuid AS supplier_uuid, s.name AS supplier_name, h.unit_cost, h.quantity, h.effective_at
  FROM ingredient_price_history h
  JOIN ingredients i ON i.tenant_id = h.tenant_id AND i.id = h.ingredient_id
  JOIN units u ON u.id = i.unit_id
  JOIN suppliers s ON s.tenant_id = h.tenant_id AND s.id = h.supplier_id
  WHERE h.tenant_id = p_tenant_id AND h.voided_at IS NULL AND i.deleted_at IS NULL
    AND (p_ingredient_uuid IS NULL OR i.uuid = p_ingredient_uuid)
    AND h.effective_at >= NOW(3) - INTERVAL p_days DAY
  ORDER BY i.name, s.name, h.effective_at DESC;
END$$
DELIMITER ;
