
DROP PROCEDURE IF EXISTS sp_audit_list;

DELIMITER $$
CREATE PROCEDURE sp_audit_list(
  IN p_tenant_id BIGINT UNSIGNED, IN p_entity VARCHAR(60), IN p_limit INT UNSIGNED, IN p_offset INT UNSIGNED
)
  READS SQL DATA
BEGIN
  SELECT a.created_at, a.action, a.entity, a.entity_uuid, a.before_json, a.after_json, a.ip,
         u.uuid AS user_uuid, u.name AS user_name
  FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
  WHERE a.tenant_id = p_tenant_id AND (p_entity IS NULL OR a.entity = p_entity)
  ORDER BY a.created_at DESC, a.id DESC LIMIT p_limit OFFSET p_offset;
END$$
DELIMITER ;
