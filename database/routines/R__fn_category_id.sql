
DROP FUNCTION IF EXISTS fn_category_id;

DELIMITER $$
CREATE FUNCTION fn_category_id(p_tenant_id BIGINT UNSIGNED, p_kind VARCHAR(20), p_uuid CHAR(36)) RETURNS BIGINT UNSIGNED
  READS SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  IF p_uuid IS NULL OR p_uuid = '' THEN RETURN NULL; END IF;
  IF p_kind = 'ingredient' THEN
    SELECT id INTO v_id FROM ingredient_categories WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
  ELSE
    SELECT id INTO v_id FROM product_categories WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
  END IF;
  IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:category'; END IF;
  RETURN v_id;
END$$
DELIMITER ;
