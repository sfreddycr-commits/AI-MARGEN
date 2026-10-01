-- scope: global — matriz de permisos (se cachea al iniciar la API).

DROP PROCEDURE IF EXISTS sp_role_permissions_list;

DELIMITER $$
CREATE PROCEDURE sp_role_permissions_list()
  READS SQL DATA
BEGIN
  SELECT r.code AS role, r.rank_level, p.code AS permission
  FROM roles r
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  LEFT JOIN permissions p ON p.id = rp.permission_id
  ORDER BY r.rank_level DESC, p.code;
END$$
DELIMITER ;
