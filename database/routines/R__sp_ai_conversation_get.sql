-- Solo el autor puede continuar su conversación.

DROP PROCEDURE IF EXISTS sp_ai_conversation_get;

DELIMITER $$
CREATE PROCEDURE sp_ai_conversation_get(IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36))
  READS SQL DATA
BEGIN
  SELECT id, uuid, title, created_at, updated_at FROM ai_conversations
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id AND uuid = p_uuid;
END$$
DELIMITER ;
