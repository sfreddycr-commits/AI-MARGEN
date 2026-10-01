
DROP PROCEDURE IF EXISTS sp_ai_message_add;

DELIMITER $$
CREATE PROCEDURE sp_ai_message_add(IN p_tenant_id BIGINT UNSIGNED, IN p_conversation_id BIGINT UNSIGNED, IN p_role VARCHAR(10), IN p_content JSON)
  MODIFIES SQL DATA
BEGIN
  INSERT INTO ai_messages (tenant_id, conversation_id, role, content) VALUES (p_tenant_id, p_conversation_id, p_role, p_content);
  UPDATE ai_conversations SET updated_at = NOW(3) WHERE tenant_id = p_tenant_id AND id = p_conversation_id;
END$$
DELIMITER ;
