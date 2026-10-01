-- Resuelve uuid → id dentro del tenant. NULL si el uuid es NULL; error si no pertenece al tenant.

DROP FUNCTION IF EXISTS fn_supplier_id;

DELIMITER $$
CREATE FUNCTION fn_supplier_id(p_tenant_id BIGINT UNSIGNED, p_uuid CHAR(36)) RETURNS BIGINT UNSIGNED
  READS SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  IF p_uuid IS NULL OR p_uuid = '' THEN RETURN NULL; END IF;
  SELECT id INTO v_id FROM suppliers WHERE tenant_id = p_tenant_id AND uuid = p_uuid;
  IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:supplier'; END IF;
  RETURN v_id;
END$$
DELIMITER ;
