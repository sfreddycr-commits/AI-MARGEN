-- scope: global — perfil de la sesión (el usuario puede no tener tenant aún).

DROP PROCEDURE IF EXISTS sp_auth_user_get;

DELIMITER $$
CREATE PROCEDURE sp_auth_user_get(IN p_user_id BIGINT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT u.id, u.uuid, u.tenant_id, t.uuid AS tenant_uuid, t.status AS tenant_status,
         u.name, u.email, r.code AS role, u.status, u.email_verified_at, u.last_login_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN tenants t ON t.id = u.tenant_id
  WHERE u.id = p_user_id AND u.deleted_at IS NULL;
END$$
DELIMITER ;
