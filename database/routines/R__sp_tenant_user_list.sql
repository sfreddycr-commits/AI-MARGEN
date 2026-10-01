
DROP PROCEDURE IF EXISTS sp_tenant_user_list;

DELIMITER $$
CREATE PROCEDURE sp_tenant_user_list(IN p_tenant_id BIGINT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT u.uuid, u.name, u.email, r.code AS role, u.status, u.email_verified_at, u.last_login_at, u.created_at
  FROM users u JOIN roles r ON r.id = u.role_id
  WHERE u.tenant_id = p_tenant_id AND u.deleted_at IS NULL
  ORDER BY r.rank_level DESC, u.name;
END$$
DELIMITER ;
