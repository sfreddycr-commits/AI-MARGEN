-- Copia independiente del producto y su receta (SOP §15).

DROP PROCEDURE IF EXISTS sp_product_duplicate;

DELIMITER $$
CREATE PROCEDURE sp_product_duplicate(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36), IN p_new_name VARCHAR(120)
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_src BIGINT UNSIGNED;
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  SELECT id INTO v_src FROM products WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
  IF v_src IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;

  START TRANSACTION;
  INSERT INTO products (tenant_id, name, category_id, portions, current_price, target_margin, multiplier,
    packaging_mode, packaging_value, labor_mode, labor_value, overhead_mode, overhead_value, waste_pct, notes,
    cost_total, cost_per_portion, cost_complete, costed_at, created_by, updated_by)
  SELECT tenant_id, p_new_name, category_id, portions, current_price, target_margin, multiplier,
    packaging_mode, packaging_value, labor_mode, labor_value, overhead_mode, overhead_value, waste_pct, notes,
    cost_total, cost_per_portion, cost_complete, costed_at, p_user_id, p_user_id
  FROM products WHERE id = v_src;
  SET v_id = LAST_INSERT_ID();
  INSERT INTO recipe_items (tenant_id, product_id, ingredient_id, quantity, unit_id, position)
  SELECT tenant_id, v_id, ingredient_id, quantity, unit_id, position
  FROM recipe_items WHERE tenant_id = p_tenant_id AND product_id = v_src;
  CALL sp_sync_bump_version(p_tenant_id, 'products');
  COMMIT;
  SELECT * FROM vw_product_rows WHERE id = v_id;
END$$
DELIMITER ;
