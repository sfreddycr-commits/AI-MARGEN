-- sp_system_ping
-- Usado por GET /api/v1/health/ready. Verifica que la BD responde y que hay migraciones aplicadas.
-- scope: global (no toca datos de tenants)

DROP PROCEDURE IF EXISTS sp_system_ping;

DELIMITER $$
CREATE PROCEDURE sp_system_ping()
  READS SQL DATA
BEGIN
  SELECT
    UTC_TIMESTAMP(3) AS db_time,
    (SELECT MAX(version) FROM schema_migrations WHERE kind = 'versioned') AS schema_version;
END$$
DELIMITER ;
