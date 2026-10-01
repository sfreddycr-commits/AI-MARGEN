-- sp_sync_bump_version
-- Incrementa la versión de una entidad para el tenant (ADR-0007).
-- La llaman los SP de escritura dentro de su misma transacción.

DROP PROCEDURE IF EXISTS sp_sync_bump_version;

DELIMITER $$
CREATE PROCEDURE sp_sync_bump_version(
  IN p_tenant_id BIGINT UNSIGNED,
  IN p_entity    VARCHAR(40)
)
  MODIFIES SQL DATA
BEGIN
  IF p_tenant_id IS NULL OR p_entity IS NULL OR p_entity NOT REGEXP '^[a-z_]{2,40}$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:entity';
  END IF;

  INSERT INTO tenant_data_versions (tenant_id, entity, version)
  VALUES (p_tenant_id, p_entity, 1)
  ON DUPLICATE KEY UPDATE version = version + 1;
END$$
DELIMITER ;
