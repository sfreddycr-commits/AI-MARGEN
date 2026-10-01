-- Un escenario nunca modifica receta ni precio base: solo guarda sus propios supuestos (SOP §18).

DROP PROCEDURE IF EXISTS sp_scenario_save;

DELIMITER $$
CREATE PROCEDURE sp_scenario_save(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36), IN p_name VARCHAR(120),
  IN p_product_uuid CHAR(36), IN p_price DECIMAL(18,6), IN p_units_per_day DECIMAL(12,4), IN p_days TINYINT UNSIGNED,
  IN p_fixed_costs DECIMAL(18,6), IN p_variable_unit_cost DECIMAL(18,6), IN p_variable_source VARCHAR(10),
  IN p_notes VARCHAR(500), IN p_row_version INT UNSIGNED, IN p_is_demo TINYINT
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_product BIGINT UNSIGNED;
  IF p_product_uuid IS NOT NULL THEN
    SELECT id INTO v_product FROM products WHERE tenant_id = p_tenant_id AND uuid = p_product_uuid;
    IF v_product IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:product'; END IF;
  END IF;
  IF p_uuid IS NULL THEN
    INSERT INTO scenarios (tenant_id, name, product_id, price, units_per_day, days_per_month, fixed_costs,
      variable_unit_cost, variable_source, notes, is_demo, created_by, updated_by)
    VALUES (p_tenant_id, p_name, v_product, p_price, p_units_per_day, p_days, p_fixed_costs,
      p_variable_unit_cost, p_variable_source, p_notes, COALESCE(p_is_demo, 0), p_user_id, p_user_id);
    SET v_id = LAST_INSERT_ID();
  ELSE
    SELECT id INTO v_id FROM scenarios WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
    IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
    UPDATE scenarios
    SET name = p_name, product_id = v_product, price = p_price, units_per_day = p_units_per_day,
        days_per_month = p_days, fixed_costs = p_fixed_costs, variable_unit_cost = p_variable_unit_cost,
        variable_source = p_variable_source, notes = p_notes, updated_by = p_user_id, row_version = row_version + 1
    WHERE id = v_id AND row_version = p_row_version;
    IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT'; END IF;
  END IF;
  CALL sp_sync_bump_version(p_tenant_id, 'scenarios');
  SELECT * FROM vw_scenario_rows WHERE id = v_id;
END$$
DELIMITER ;
