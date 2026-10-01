-- Productos activos que usan alguno de los ingredientes (ids internos), para recalcular costos.

DROP PROCEDURE IF EXISTS sp_product_uuids_by_ingredients;

DELIMITER $$
CREATE PROCEDURE sp_product_uuids_by_ingredients(IN p_tenant_id BIGINT UNSIGNED, IN p_ingredient_ids JSON)
  READS SQL DATA
BEGIN
  SELECT DISTINCT p.uuid
  FROM recipe_items ri
  JOIN products p ON p.tenant_id = ri.tenant_id AND p.id = ri.product_id AND p.deleted_at IS NULL
  JOIN JSON_TABLE(p_ingredient_ids, '$[*]' COLUMNS (id BIGINT UNSIGNED PATH '$')) j ON j.id = ri.ingredient_id
  WHERE ri.tenant_id = p_tenant_id;
END$$
DELIMITER ;
