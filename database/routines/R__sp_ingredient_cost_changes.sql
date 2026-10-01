-- Costo vigente vs. último costo anterior a la ventana, para detectar aumentos (alertas e insights).

DROP PROCEDURE IF EXISTS sp_ingredient_cost_changes;

DELIMITER $$
CREATE PROCEDURE sp_ingredient_cost_changes(IN p_tenant_id BIGINT UNSIGNED, IN p_days SMALLINT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT i.uuid, i.name, u.code AS unit, i.current_unit_cost, i.last_cost_at,
         prev.unit_cost AS previous_unit_cost, prev.effective_at AS previous_at
  FROM ingredients i
  JOIN units u ON u.id = i.unit_id
  JOIN ingredient_price_history prev ON prev.id = (
    SELECT h.id FROM ingredient_price_history h
    WHERE h.tenant_id = i.tenant_id AND h.ingredient_id = i.id AND h.voided_at IS NULL
      AND h.effective_at < NOW(3) - INTERVAL p_days DAY
    ORDER BY h.effective_at DESC, h.id DESC LIMIT 1)
  WHERE i.tenant_id = p_tenant_id AND i.deleted_at IS NULL AND i.current_unit_cost IS NOT NULL
    AND i.last_cost_at >= NOW(3) - INTERVAL p_days DAY;
END$$
DELIMITER ;
