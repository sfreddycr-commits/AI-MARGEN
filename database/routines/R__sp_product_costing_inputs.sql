-- Entradas del motor para recalcular costos. p_uuids NULL = todos los productos activos.
-- Result set 1: productos. Result set 2: líneas de receta con datos del ingrediente.

DROP PROCEDURE IF EXISTS sp_product_costing_inputs;

DELIMITER $$
CREATE PROCEDURE sp_product_costing_inputs(IN p_tenant_id BIGINT UNSIGNED, IN p_uuids JSON)
  READS SQL DATA
BEGIN
  SELECT p.uuid, p.portions, p.packaging_mode, p.packaging_value, p.labor_mode, p.labor_value,
         p.overhead_mode, p.overhead_value, p.waste_pct, p.cost_total, p.cost_per_portion, p.cost_complete
  FROM products p
  WHERE p.tenant_id = p_tenant_id AND p.deleted_at IS NULL
    AND (p_uuids IS NULL OR p.uuid IN (SELECT u FROM JSON_TABLE(p_uuids, '$[*]' COLUMNS (u CHAR(36) COLLATE utf8mb4_0900_ai_ci PATH '$')) j));

  SELECT p.uuid AS product_uuid, r.uuid AS ingredient_uuid, r.name AS ingredient_name, r.unit AS ingredient_unit,
         r.current_unit_cost, r.yield_fraction, r.conversions, ri.quantity, u.code AS unit
  FROM recipe_items ri
  JOIN products p ON p.tenant_id = ri.tenant_id AND p.id = ri.product_id
  JOIN vw_ingredient_rows r ON r.tenant_id = ri.tenant_id AND r.id = ri.ingredient_id
  JOIN units u ON u.id = ri.unit_id
  WHERE ri.tenant_id = p_tenant_id AND p.deleted_at IS NULL
    AND (p_uuids IS NULL OR p.uuid IN (SELECT u FROM JSON_TABLE(p_uuids, '$[*]' COLUMNS (u CHAR(36) COLLATE utf8mb4_0900_ai_ci PATH '$')) j))
  ORDER BY p.uuid, ri.position;
END$$
DELIMITER ;
