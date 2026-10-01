-- Crea (p_uuid NULL) o actualiza un ingrediente. Las conversiones propias se reemplazan completas.
-- Si se envía p_unit_cost en la creación, se registra como primer costo (historial 'manual').
-- La unidad de costeo no puede cambiar si ya existe historial de costos.

DROP PROCEDURE IF EXISTS sp_ingredient_save;

DELIMITER $$
CREATE PROCEDURE sp_ingredient_save(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36),
  IN p_name VARCHAR(120), IN p_category_uuid CHAR(36), IN p_unit VARCHAR(10), IN p_yield DECIMAL(9,6),
  IN p_notes VARCHAR(500), IN p_conversions JSON, IN p_row_version INT UNSIGNED,
  IN p_unit_cost DECIMAL(18,6), IN p_cost_supplier_uuid CHAR(36), IN p_cost_date DATE, IN p_is_demo TINYINT
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_unit TINYINT UNSIGNED DEFAULT fn_unit_id(p_unit);
  DECLARE v_old_unit TINYINT UNSIGNED;
  DECLARE v_cat BIGINT UNSIGNED DEFAULT fn_category_id(p_tenant_id, 'ingredient', p_category_uuid);
  DECLARE v_sup BIGINT UNSIGNED DEFAULT fn_supplier_id(p_tenant_id, p_cost_supplier_uuid);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF v_unit IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:unit'; END IF;
  START TRANSACTION;
  IF p_uuid IS NULL THEN
    INSERT INTO ingredients (tenant_id, name, category_id, unit_id, yield_fraction, notes, is_demo, created_by, updated_by)
    VALUES (p_tenant_id, p_name, v_cat, v_unit, COALESCE(p_yield, 1), p_notes, COALESCE(p_is_demo, 0), p_user_id, p_user_id);
    SET v_id = LAST_INSERT_ID();
    IF p_unit_cost IS NOT NULL THEN
      INSERT INTO ingredient_price_history (tenant_id, ingredient_id, supplier_id, unit_cost, source, effective_at, created_by)
      VALUES (p_tenant_id, v_id, v_sup, p_unit_cost, 'manual',
              IF(p_cost_date IS NULL OR p_cost_date = CURDATE(), NOW(3), TIMESTAMP(p_cost_date, '12:00:00')), p_user_id);
      UPDATE ingredients SET current_unit_cost = p_unit_cost, current_supplier_id = v_sup,
             last_cost_at = IF(p_cost_date IS NULL OR p_cost_date = CURDATE(), NOW(3), TIMESTAMP(p_cost_date, '12:00:00'))
      WHERE id = v_id;
    END IF;
  ELSE
    SELECT id, unit_id INTO v_id, v_old_unit FROM ingredients WHERE tenant_id = p_tenant_id AND uuid = p_uuid FOR UPDATE;
    IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
    IF v_old_unit <> v_unit AND EXISTS (
      SELECT 1 FROM ingredient_price_history WHERE tenant_id = p_tenant_id AND ingredient_id = v_id
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:unit_locked';
    END IF;
    UPDATE ingredients
    SET name = p_name, category_id = v_cat, unit_id = v_unit, yield_fraction = COALESCE(p_yield, 1),
        notes = p_notes, updated_by = p_user_id, row_version = row_version + 1
    WHERE id = v_id AND row_version = p_row_version;
    IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT'; END IF;
  END IF;

  IF p_conversions IS NOT NULL THEN
    DELETE FROM unit_conversions WHERE tenant_id = p_tenant_id AND ingredient_id = v_id;
    INSERT INTO unit_conversions (tenant_id, ingredient_id, from_unit_id, to_unit_id, factor)
    SELECT p_tenant_id, v_id, fn_unit_id(j.f), fn_unit_id(j.t), j.factor
    FROM JSON_TABLE(p_conversions, '$[*]' COLUMNS (
      f VARCHAR(10) COLLATE utf8mb4_0900_ai_ci PATH '$.from', t VARCHAR(10) COLLATE utf8mb4_0900_ai_ci PATH '$.to', factor DECIMAL(18,6) PATH '$.factor'
    )) j;
  END IF;

  CALL sp_sync_bump_version(p_tenant_id, 'ingredients');
  COMMIT;
  SELECT * FROM vw_ingredient_rows WHERE id = v_id;
END$$
DELIMITER ;
