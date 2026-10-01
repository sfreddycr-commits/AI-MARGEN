
DROP PROCEDURE IF EXISTS sp_ai_conversation_list;

DELIMITER $$
CREATE PROCEDURE sp_ai_conversation_list(IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_limit INT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT uuid, title, created_at, updated_at FROM ai_conversations
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id ORDER BY updated_at DESC LIMIT p_limit;
END$$
DELIMITER ;
