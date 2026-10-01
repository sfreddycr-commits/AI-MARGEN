-- Compras no anuladas con cantidad, de los últimos p_days días, para promedio ponderado.

DROP PROCEDURE IF EXISTS sp_ingredient_history_window;

DELIMITER $$
CREATE PROCEDURE sp_ingredient_history_window(IN p_tenant_id BIGINT UNSIGNED, IN p_ids JSON, IN p_days SMALLINT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT h.ingredient_id, h.quantity, h.unit_cost
  FROM ingredient_price_history h
  JOIN JSON_TABLE(p_ids, '$[*]' COLUMNS (id BIGINT UNSIGNED PATH '$')) j ON j.id = h.ingredient_id
  WHERE h.tenant_id = p_tenant_id AND h.voided_at IS NULL AND h.quantity IS NOT NULL
    AND h.effective_at >= NOW(3) - INTERVAL p_days DAY;
END$$
DELIMITER ;
