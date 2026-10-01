
DROP PROCEDURE IF EXISTS sp_fixed_cost_save;

DELIMITER $$
CREATE PROCEDURE sp_fixed_cost_save(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36), IN p_name VARCHAR(120),
  IN p_amount DECIMAL(18,6), IN p_notes VARCHAR(500), IN p_row_version INT UNSIGNED, IN p_is_demo TINYINT
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  IF p_uuid IS NULL THEN
    INSERT INTO fixed_costs (tenant_id, name, monthly_amount, notes, is_demo, created_by, updated_by)
    VALUES (p_tenant_id, p_name, p_amount, p_notes, COALESCE(p_is_demo, 0), p_user_id, p_user_id);
    SET v_id = LAST_INSERT_ID();
  ELSE
    SELECT id INTO v_id FROM fixed_costs WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
    IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
    UPDATE fixed_costs SET name = p_name, monthly_amount = p_amount, notes = p_notes, updated_by = p_user_id,
           row_version = row_version + 1
    WHERE id = v_id AND row_version = p_row_version;
    IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT'; END IF;
  END IF;
  CALL sp_sync_bump_version(p_tenant_id, 'fixed_costs');
  SELECT * FROM vw_fixed_cost_rows WHERE id = v_id;
END$$
DELIMITER ;
