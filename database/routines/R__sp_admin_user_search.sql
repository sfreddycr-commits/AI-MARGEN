-- scope: global

DROP PROCEDURE IF EXISTS sp_admin_user_search;

DELIMITER $$
CREATE PROCEDURE sp_admin_user_search(IN p_search VARCHAR(190), IN p_limit INT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT u.uuid, u.name, u.email, r.code AS role, u.status, u.email_verified_at, u.last_login_at, u.created_at,
         t.uuid AS tenant_uuid, t.name AS tenant_name, (u.locked_until IS NOT NULL AND u.locked_until > NOW(3)) AS is_locked
  FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN tenants t ON t.id = u.tenant_id
  WHERE u.deleted_at IS NULL
    AND (p_search IS NULL OR u.email LIKE CONCAT('%', p_search, '%') OR u.name LIKE CONCAT('%', p_search, '%'))
  ORDER BY u.created_at DESC LIMIT p_limit;
END$$
DELIMITER ;
