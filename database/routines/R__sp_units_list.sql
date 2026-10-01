-- scope: global — catálogo de unidades.

DROP PROCEDURE IF EXISTS sp_units_list;

DELIMITER $$
CREATE PROCEDURE sp_units_list()
  READS SQL DATA
BEGIN
  SELECT code, name, dimension, factor_to_base FROM units ORDER BY sort_order;
END$$
DELIMITER ;
