-- Transición única desde 'pending'; evita confirmar dos veces el mismo borrador.

DROP PROCEDURE IF EXISTS sp_ai_draft_set_status;

DELIMITER $$
CREATE PROCEDURE sp_ai_draft_set_status(
  IN p_tenant_id BIGINT UNSIGNED, IN p_uuid CHAR(36), IN p_status VARCHAR(20), IN p_result_uuid CHAR(36), IN p_payload JSON
)
  MODIFIES SQL DATA
BEGIN
  UPDATE ai_drafts
  SET status = p_status, result_uuid = p_result_uuid, payload = COALESCE(p_payload, payload),
      confirmed_at = IF(p_status = 'confirmed', NOW(3), confirmed_at)
  WHERE tenant_id = p_tenant_id AND uuid = p_uuid AND status = 'pending';
  IF ROW_COUNT() = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT:draft_not_pending'; END IF;
END$$
DELIMITER ;
