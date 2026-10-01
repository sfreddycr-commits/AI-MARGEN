-- scope: global — login por correo.

DROP PROCEDURE IF EXISTS sp_auth_user_get_by_email;

DELIMITER $$
CREATE PROCEDURE sp_auth_user_get_by_email(IN p_email VARCHAR(190))
  READS SQL DATA
BEGIN
  SELECT u.id, u.uuid, u.tenant_id, t.uuid AS tenant_uuid, t.status AS tenant_status,
         u.name, u.email, u.password_hash, r.code AS role, u.status, u.email_verified_at,
         u.failed_login_count, u.locked_until,
         (u.locked_until IS NOT NULL AND u.locked_until > NOW(3)) AS is_locked
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN tenants t ON t.id = u.tenant_id
  WHERE u.email = p_email AND u.deleted_at IS NULL;
END$$
DELIMITER ;
