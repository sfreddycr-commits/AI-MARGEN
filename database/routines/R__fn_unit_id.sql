-- Id de una unidad por código; NULL si no existe.

DROP FUNCTION IF EXISTS fn_unit_id;

DELIMITER $$
CREATE FUNCTION fn_unit_id(p_code VARCHAR(10)) RETURNS TINYINT UNSIGNED
  READS SQL DATA
BEGIN
  DECLARE v_id TINYINT UNSIGNED;
  SELECT id INTO v_id FROM units WHERE code = p_code;
  RETURN v_id;
END$$
DELIMITER ;
