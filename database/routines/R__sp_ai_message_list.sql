
DROP PROCEDURE IF EXISTS sp_ai_message_list;

DELIMITER $$
CREATE PROCEDURE sp_ai_message_list(IN p_tenant_id BIGINT UNSIGNED, IN p_conversation_id BIGINT UNSIGNED, IN p_limit INT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT role, content, created_at FROM (
    SELECT id, role, content, created_at FROM ai_messages
    WHERE tenant_id = p_tenant_id AND conversation_id = p_conversation_id
    ORDER BY id DESC LIMIT p_limit) m
  ORDER BY id;
END$$
DELIMITER ;
