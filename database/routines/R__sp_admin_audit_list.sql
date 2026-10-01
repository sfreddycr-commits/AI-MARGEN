-- scope: global

DROP PROCEDURE IF EXISTS sp_admin_audit_list;

DELIMITER $$
CREATE PROCEDURE sp_admin_audit_list(IN p_tenant_uuid CHAR(36), IN p_action VARCHAR(60), IN p_limit INT UNSIGNED, IN p_offset INT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT a.created_at, a.action, a.entity, a.entity_uuid, a.before_json, a.after_json, a.ip, a.user_agent, a.request_id,
         u.uuid AS user_uuid, u.email AS user_email, t.uuid AS tenant_uuid, t.name AS tenant_name
  FROM audit_logs a
  LEFT JOIN users u ON u.id = a.user_id
  LEFT JOIN tenants t ON t.id = a.tenant_id
  WHERE (p_tenant_uuid IS NULL OR t.uuid = p_tenant_uuid)
    AND (p_action IS NULL OR a.action LIKE CONCAT(p_action, '%'))
  ORDER BY a.created_at DESC, a.id DESC LIMIT p_limit OFFSET p_offset;
END$$
DELIMITER ;
