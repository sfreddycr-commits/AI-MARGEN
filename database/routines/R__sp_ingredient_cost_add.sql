-- Registra un costo manual (sin compra) en el historial y recalcula el costo vigente.

DROP PROCEDURE IF EXISTS sp_ingredient_cost_add;

DELIMITER $$
CREATE PROCEDURE sp_ingredient_cost_add(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36),
  IN p_unit_cost DECIMAL(18,6), IN p_supplier_uuid CHAR(36), IN p_date DATE
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_sup BIGINT UNSIGNED DEFAULT fn_supplier_id(p_tenant_id, p_supplier_uuid);
  SELECT id INTO v_id FROM ingredients WHERE tenant_id = p_tenant_id AND uuid = p_uuid AND deleted_at IS NULL;
  IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
  INSERT INTO ingredient_price_history (tenant_id, ingredient_id, supplier_id, unit_cost, source, effective_at, created_by)
  VALUES (p_tenant_id, v_id, v_sup, p_unit_cost, 'manual',
          IF(p_date IS NULL OR p_date = CURDATE(), NOW(3), TIMESTAMP(p_date, '12:00:00')), p_user_id);
  CALL sp_ingredient_recalc_current(p_tenant_id, JSON_ARRAY(v_id));
  SELECT v_id AS id;
END$$
DELIMITER ;
