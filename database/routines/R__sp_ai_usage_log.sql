
DROP PROCEDURE IF EXISTS sp_ai_usage_log;

DELIMITER $$
CREATE PROCEDURE sp_ai_usage_log(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_feature VARCHAR(20), IN p_provider VARCHAR(30),
  IN p_model VARCHAR(80), IN p_input_tokens INT UNSIGNED, IN p_output_tokens INT UNSIGNED, IN p_cost_usd DECIMAL(12,6)
)
  MODIFIES SQL DATA
BEGIN
  INSERT INTO ai_usage (tenant_id, user_id, feature, provider, model, input_tokens, output_tokens, cost_usd)
  VALUES (p_tenant_id, p_user_id, p_feature, p_provider, p_model, p_input_tokens, p_output_tokens, p_cost_usd);
END$$
DELIMITER ;
