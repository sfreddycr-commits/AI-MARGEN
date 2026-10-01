-- scope: global

DROP PROCEDURE IF EXISTS sp_admin_flags_list;

DELIMITER $$
CREATE PROCEDURE sp_admin_flags_list(IN p_tenant_uuid CHAR(36))
  READS SQL DATA
BEGIN
  SELECT f.code, f.description, f.default_enabled, tf.enabled AS tenant_override,
         COALESCE(tf.enabled, f.default_enabled) AS enabled
  FROM feature_flags f
  LEFT JOIN tenants t ON t.uuid = p_tenant_uuid
  LEFT JOIN tenant_feature_flags tf ON tf.flag_id = f.id AND tf.tenant_id = t.id
  ORDER BY f.code;
END$$
DELIMITER ;
