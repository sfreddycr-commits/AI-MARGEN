
DROP PROCEDURE IF EXISTS sp_product_get;

DELIMITER $$
CREATE PROCEDURE sp_product_get(IN p_tenant_id BIGINT UNSIGNED, IN p_uuid CHAR(36))
  READS SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  SELECT id INTO v_id FROM products WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
  IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
  SELECT * FROM vw_product_rows WHERE id = v_id;
  SELECT r.uuid AS ingredient_uuid, r.name AS ingredient_name, r.unit AS ingredient_unit,
         r.current_unit_cost, r.yield_fraction, r.conversions, r.deleted_at AS ingredient_deleted_at,
         ri.quantity, u.code AS unit, ri.position
  FROM recipe_items ri
  JOIN vw_ingredient_rows r ON r.tenant_id = ri.tenant_id AND r.id = ri.ingredient_id
  JOIN units u ON u.id = ri.unit_id
  WHERE ri.tenant_id = p_tenant_id AND ri.product_id = v_id
  ORDER BY ri.position;
END$$
DELIMITER ;
