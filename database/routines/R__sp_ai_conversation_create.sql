
DROP PROCEDURE IF EXISTS sp_ai_conversation_create;

DELIMITER $$
CREATE PROCEDURE sp_ai_conversation_create(IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_title VARCHAR(160))
  MODIFIES SQL DATA
BEGIN
  INSERT INTO ai_conversations (tenant_id, user_id, title) VALUES (p_tenant_id, p_user_id, LEFT(p_title, 160));
  SELECT id, uuid FROM ai_conversations WHERE id = LAST_INSERT_ID();
END$$
DELIMITER ;
