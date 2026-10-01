-- Cambio de precio / margen objetivo / multiplicador desde la pantalla de precios (auditable).

DROP PROCEDURE IF EXISTS sp_product_price_set;

DELIMITER $$
CREATE PROCEDURE sp_product_price_set(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36),
  IN p_price DECIMAL(18,6), IN p_target_margin DECIMAL(9,6), IN p_multiplier DECIMAL(9,4), IN p_row_version INT UNSIGNED
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_before JSON;
  SELECT id, JSON_OBJECT('current_price', CAST(current_price AS CHAR), 'target_margin', CAST(target_margin AS CHAR),
                         'multiplier', CAST(multiplier AS CHAR))
    INTO v_id, v_before
  FROM products WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
  IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
  UPDATE products
  SET current_price = p_price, target_margin = p_target_margin, multiplier = p_multiplier,
      updated_by = p_user_id, row_version = row_version + 1
  WHERE id = v_id AND row_version = p_row_version;
  IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT'; END IF;
  CALL sp_sync_bump_version(p_tenant_id, 'products');
  SELECT r.*, v_before AS before_json FROM vw_product_rows r WHERE r.id = v_id;
END$$
DELIMITER ;
