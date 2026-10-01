
DROP PROCEDURE IF EXISTS sp_tenant_flags;

DELIMITER $$
CREATE PROCEDURE sp_tenant_flags(IN p_tenant_id BIGINT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT f.code, COALESCE(tf.enabled, f.default_enabled) AS enabled
  FROM feature_flags f
  LEFT JOIN tenant_feature_flags tf ON tf.flag_id = f.id AND tf.tenant_id = p_tenant_id
  ORDER BY f.code;
END$$
DELIMITER ;
