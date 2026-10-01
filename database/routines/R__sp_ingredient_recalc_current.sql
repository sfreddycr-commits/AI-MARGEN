-- Costo vigente = último costo no anulado del historial (método "última compra").
-- No contiene fórmulas: solo selecciona el registro más reciente. Para promedio ponderado,
-- la API calcula con el motor y luego llama a sp_ingredient_current_cost_set.

DROP PROCEDURE IF EXISTS sp_ingredient_recalc_current;

DELIMITER $$
CREATE PROCEDURE sp_ingredient_recalc_current(IN p_tenant_id BIGINT UNSIGNED, IN p_ids JSON)
  MODIFIES SQL DATA
BEGIN
  UPDATE ingredients i
  JOIN JSON_TABLE(p_ids, '$[*]' COLUMNS (id BIGINT UNSIGNED PATH '$')) j ON j.id = i.id
  LEFT JOIN ingredient_price_history h ON h.id = (
    SELECT h2.id FROM ingredient_price_history h2
    WHERE h2.tenant_id = i.tenant_id AND h2.ingredient_id = i.id AND h2.voided_at IS NULL
    ORDER BY h2.effective_at DESC, h2.id DESC LIMIT 1)
  SET i.current_unit_cost = h.unit_cost, i.current_supplier_id = h.supplier_id,
      i.last_cost_at = h.effective_at, i.row_version = i.row_version + 1
  WHERE i.tenant_id = p_tenant_id;
  CALL sp_sync_bump_version(p_tenant_id, 'ingredients');
END$$
DELIMITER ;
