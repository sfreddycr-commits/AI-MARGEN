-- sp_audit_log_create
-- Registra un evento de auditoría (SOP §35). Única vía de escritura en audit_logs (solo inserción).
-- p_tenant_id puede ser NULL para acciones de plataforma (super_admin / sistema).

DROP PROCEDURE IF EXISTS sp_audit_log_create;

DELIMITER $$
CREATE PROCEDURE sp_audit_log_create(
  IN p_tenant_id   BIGINT UNSIGNED,
  IN p_user_id     BIGINT UNSIGNED,
  IN p_action      VARCHAR(60),
  IN p_entity      VARCHAR(60),
  IN p_entity_uuid CHAR(36),
  IN p_before_json JSON,
  IN p_after_json  JSON,
  IN p_ip          VARCHAR(45),
  IN p_user_agent  VARCHAR(255),
  IN p_request_id  VARCHAR(64)
)
  MODIFIES SQL DATA
BEGIN
  IF p_action IS NULL OR TRIM(p_action) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:action';
  END IF;

  INSERT INTO audit_logs (
    tenant_id, user_id, action, entity, entity_uuid,
    before_json, after_json, ip, user_agent, request_id
  ) VALUES (
    p_tenant_id, p_user_id, p_action, p_entity, p_entity_uuid,
    p_before_json, p_after_json, p_ip, LEFT(p_user_agent, 255), p_request_id
  );

  SELECT LAST_INSERT_ID() AS id;
END$$
DELIMITER ;
