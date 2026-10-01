
DROP PROCEDURE IF EXISTS sp_ai_tool_call_log;

DELIMITER $$
CREATE PROCEDURE sp_ai_tool_call_log(
  IN p_tenant_id BIGINT UNSIGNED, IN p_conversation_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_tool VARCHAR(60),
  IN p_input JSON, IN p_output JSON, IN p_status VARCHAR(10), IN p_duration_ms INT UNSIGNED
)
  MODIFIES SQL DATA
BEGIN
  INSERT INTO ai_tool_calls (tenant_id, conversation_id, user_id, tool, input_json, output_json, status, duration_ms)
  VALUES (p_tenant_id, p_conversation_id, p_user_id, p_tool, p_input, p_output, p_status, p_duration_ms);
END$$
DELIMITER ;
