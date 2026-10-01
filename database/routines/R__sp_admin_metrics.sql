-- scope: global — métricas SaaS (SOP §11).

DROP PROCEDURE IF EXISTS sp_admin_metrics;

DELIMITER $$
CREATE PROCEDURE sp_admin_metrics()
  READS SQL DATA
BEGIN
  SELECT
    (SELECT COUNT(*) FROM tenants WHERE status = 'active') AS tenants_active,
    (SELECT COUNT(*) FROM tenants WHERE status = 'suspended') AS tenants_suspended,
    (SELECT COUNT(*) FROM users WHERE status = 'active' AND deleted_at IS NULL AND tenant_id IS NOT NULL) AS users_active,
    (SELECT COUNT(*) FROM users WHERE last_login_at >= NOW(3) - INTERVAL 30 DAY) AS users_active_30d,
    (SELECT COUNT(*) FROM users WHERE created_at >= NOW(3) - INTERVAL 7 DAY) AS signups_7d,
    (SELECT COUNT(*) FROM users WHERE created_at >= NOW(3) - INTERVAL 30 DAY) AS signups_30d,
    (SELECT COUNT(*) FROM ai_usage WHERE created_at >= DATE_FORMAT(NOW(3), '%Y-%m-01')) AS ai_calls_month,
    (SELECT COALESCE(SUM(cost_usd), 0) FROM ai_usage WHERE created_at >= DATE_FORMAT(NOW(3), '%Y-%m-01')) AS ai_cost_month,
    (SELECT COUNT(*) FROM ai_tool_calls WHERE status <> 'ok' AND created_at >= DATE_FORMAT(NOW(3), '%Y-%m-01')) AS ai_tool_errors_month,
    (SELECT COALESCE(SUM(size_bytes), 0) FROM uploaded_documents WHERE deleted_at IS NULL) AS storage_bytes,
    (SELECT COUNT(*) FROM exports WHERE created_at >= DATE_FORMAT(NOW(3), '%Y-%m-01')) AS exports_month,
    (SELECT COUNT(*) FROM users WHERE locked_until > NOW(3)) AS users_locked,
    (SELECT COUNT(*) FROM audit_logs WHERE action = 'auth.login_failed' AND created_at >= NOW(3) - INTERVAL 1 DAY) AS failed_logins_24h;
END$$
DELIMITER ;
