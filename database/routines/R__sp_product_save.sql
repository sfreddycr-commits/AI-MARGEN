-- Crea (p_uuid NULL) o actualiza un producto y reemplaza su receta. Los costos llegan del motor.
-- p_items: [{ingredient_uuid, quantity, unit}]

DROP PROCEDURE IF EXISTS sp_product_save;

DELIMITER $$
CREATE PROCEDURE sp_product_save(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36),
  IN p_name VARCHAR(120), IN p_category_uuid CHAR(36), IN p_portions DECIMAL(12,4),
  IN p_price DECIMAL(18,6), IN p_target_margin DECIMAL(9,6), IN p_multiplier DECIMAL(9,4),
  IN p_packaging_mode VARCHAR(10), IN p_packaging_value DECIMAL(18,6),
  IN p_labor_mode VARCHAR(10), IN p_labor_value DECIMAL(18,6),
  IN p_overhead_mode VARCHAR(10), IN p_overhead_value DECIMAL(18,6),
  IN p_waste_pct DECIMAL(9,6), IN p_notes VARCHAR(1000), IN p_items JSON,
  IN p_cost_total DECIMAL(18,6), IN p_cost_per_portion DECIMAL(18,6), IN p_cost_complete TINYINT,
  IN p_row_version INT UNSIGNED, IN p_is_demo TINYINT
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_cat BIGINT UNSIGNED DEFAULT fn_category_id(p_tenant_id, 'product', p_category_uuid);
  DECLARE v_lines INT DEFAULT COALESCE(JSON_LENGTH(p_items), 0);
  DECLARE v_valid INT;
  DECLARE v_before JSON;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  SELECT COUNT(*) INTO v_valid
  FROM JSON_TABLE(COALESCE(p_items, JSON_ARRAY()), '$[*]' COLUMNS (u CHAR(36) COLLATE utf8mb4_0900_ai_ci PATH '$.ingredient_uuid', unit VARCHAR(10) COLLATE utf8mb4_0900_ai_ci PATH '$.unit')) j
  JOIN ingredients i ON i.tenant_id = p_tenant_id AND i.uuid = j.u
  JOIN units un ON un.code = j.unit;
  IF v_valid <> v_lines THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:ingredient'; END IF;

  START TRANSACTION;
  IF p_uuid IS NULL THEN
    INSERT INTO products (tenant_id, name, category_id, portions, current_price, target_margin, multiplier,
      packaging_mode, packaging_value, labor_mode, labor_value, overhead_mode, overhead_value, waste_pct, notes,
      cost_total, cost_per_portion, cost_complete, costed_at, is_demo, created_by, updated_by)
    VALUES (p_tenant_id, p_name, v_cat, p_portions, p_price, p_target_margin, p_multiplier,
      p_packaging_mode, p_packaging_value, p_labor_mode, p_labor_value, p_overhead_mode, p_overhead_value, p_waste_pct, p_notes,
      p_cost_total, p_cost_per_portion, p_cost_complete, NOW(3), COALESCE(p_is_demo, 0), p_user_id, p_user_id);
    SET v_id = LAST_INSERT_ID();
  ELSE
    SELECT id, JSON_OBJECT('current_price', CAST(current_price AS CHAR), 'target_margin', CAST(target_margin AS CHAR),
                           'cost_per_portion', CAST(cost_per_portion AS CHAR), 'portions', CAST(portions AS CHAR))
      INTO v_id, v_before
    FROM products WHERE tenant_id = p_tenant_id AND uuid = p_uuid FOR UPDATE;
    IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
    UPDATE products
    SET name = p_name, category_id = v_cat, portions = p_portions, current_price = p_price,
        target_margin = p_target_margin, multiplier = p_multiplier,
        packaging_mode = p_packaging_mode, packaging_value = p_packaging_value,
        labor_mode = p_labor_mode, labor_value = p_labor_value,
        overhead_mode = p_overhead_mode, overhead_value = p_overhead_value,
        waste_pct = p_waste_pct, notes = p_notes,
        cost_total = p_cost_total, cost_per_portion = p_cost_per_portion, cost_complete = p_cost_complete,
        costed_at = NOW(3), updated_by = p_user_id, row_version = row_version + 1
    WHERE id = v_id AND row_version = p_row_version;
    IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT'; END IF;
    DELETE FROM recipe_items WHERE tenant_id = p_tenant_id AND product_id = v_id;
  END IF;

  INSERT INTO recipe_items (tenant_id, product_id, ingredient_id, quantity, unit_id, position)
  SELECT p_tenant_id, v_id, i.id, j.quantity, un.id, j.pos
  FROM JSON_TABLE(COALESCE(p_items, JSON_ARRAY()), '$[*]' COLUMNS (
    pos FOR ORDINALITY, u CHAR(36) COLLATE utf8mb4_0900_ai_ci PATH '$.ingredient_uuid', quantity DECIMAL(18,6) PATH '$.quantity', unit VARCHAR(10) COLLATE utf8mb4_0900_ai_ci PATH '$.unit'
  )) j
  JOIN ingredients i ON i.tenant_id = p_tenant_id AND i.uuid = j.u
  JOIN units un ON un.code = j.unit;

  CALL sp_sync_bump_version(p_tenant_id, 'products');
  CALL sp_sync_bump_version(p_tenant_id, 'ingredients');
  COMMIT;
  SELECT r.*, v_before AS before_json FROM vw_product_rows r WHERE r.id = v_id;
END$$
DELIMITER ;
