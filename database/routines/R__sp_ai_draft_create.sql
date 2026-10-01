
DROP PROCEDURE IF EXISTS sp_ai_draft_create;

DELIMITER $$
CREATE PROCEDURE sp_ai_draft_create(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_kind VARCHAR(20), IN p_payload JSON,
  IN p_document_uuid CHAR(36), IN p_ttl_hours SMALLINT UNSIGNED
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_doc BIGINT UNSIGNED;
  IF p_document_uuid IS NOT NULL THEN
    SELECT id INTO v_doc FROM uploaded_documents WHERE tenant_id = p_tenant_id AND uuid = p_document_uuid;
    IF v_doc IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:document'; END IF;
  END IF;
  INSERT INTO ai_drafts (tenant_id, user_id, kind, payload, document_id, expires_at)
  VALUES (p_tenant_id, p_user_id, p_kind, p_payload, v_doc, NOW(3) + INTERVAL p_ttl_hours HOUR);
  SELECT uuid, expires_at FROM ai_drafts WHERE id = LAST_INSERT_ID();
END$$
DELIMITER ;
