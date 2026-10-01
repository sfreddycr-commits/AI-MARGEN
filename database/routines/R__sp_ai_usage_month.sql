
DROP PROCEDURE IF EXISTS sp_ai_usage_month;

DELIMITER $$
CREATE PROCEDURE sp_ai_usage_month(IN p_tenant_id BIGINT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT feature, COUNT(*) AS calls, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens
  FROM ai_usage
  WHERE tenant_id = p_tenant_id AND created_at >= DATE_FORMAT(NOW(3), '%Y-%m-01')
  GROUP BY feature;
END$$
DELIMITER ;
