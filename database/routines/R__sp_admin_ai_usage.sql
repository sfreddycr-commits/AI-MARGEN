-- scope: global — consumo de IA por tenant en un período.

DROP PROCEDURE IF EXISTS sp_admin_ai_usage;

DELIMITER $$
CREATE PROCEDURE sp_admin_ai_usage(IN p_from DATE, IN p_to DATE)
  READS SQL DATA
BEGIN
  SELECT t.uuid AS tenant_uuid, t.name AS tenant_name, COUNT(a.id) AS calls,
         COALESCE(SUM(a.input_tokens), 0) AS input_tokens, COALESCE(SUM(a.output_tokens), 0) AS output_tokens,
         COALESCE(SUM(a.cost_usd), 0) AS cost_usd,
         (SELECT COUNT(*) FROM ai_tool_calls c WHERE c.tenant_id = t.id AND c.created_at >= p_from AND c.created_at < p_to + INTERVAL 1 DAY) AS tool_calls,
         (SELECT COUNT(*) FROM ai_tool_calls c WHERE c.tenant_id = t.id AND c.status <> 'ok' AND c.created_at >= p_from AND c.created_at < p_to + INTERVAL 1 DAY) AS tool_errors
  FROM tenants t
  JOIN ai_usage a ON a.tenant_id = t.id AND a.created_at >= p_from AND a.created_at < p_to + INTERVAL 1 DAY
  GROUP BY t.id, t.uuid, t.name
  ORDER BY cost_usd DESC;
END$$
DELIMITER ;
