-- scope: global

DROP PROCEDURE IF EXISTS sp_admin_tenant_get;

DELIMITER $$
CREATE PROCEDURE sp_admin_tenant_get(IN p_uuid CHAR(36))
  READS SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  SELECT id INTO v_id FROM tenants WHERE uuid = p_uuid;
  IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
  SELECT t.uuid, t.name, t.slug, t.legal_name, t.email, t.phone, t.business_type, t.country, t.currency, t.timezone,
         t.status, pl.code AS plan, t.is_demo, t.created_at, t.last_activity_at, t.onboarding_completed_at,
         (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.deleted_at IS NULL) AS users_count,
         (SELECT COUNT(*) FROM ingredients i WHERE i.tenant_id = t.id AND i.deleted_at IS NULL) AS ingredients_count,
         (SELECT COUNT(*) FROM products p WHERE p.tenant_id = t.id AND p.deleted_at IS NULL) AS products_count,
         (SELECT COUNT(*) FROM purchases p WHERE p.tenant_id = t.id AND p.voided_at IS NULL) AS purchases_count,
         (SELECT COALESCE(SUM(size_bytes), 0) FROM uploaded_documents d WHERE d.tenant_id = t.id AND d.deleted_at IS NULL) AS storage_bytes,
         (SELECT COUNT(*) FROM exports e WHERE e.tenant_id = t.id) AS exports_count,
         (SELECT COUNT(*) FROM ai_usage a WHERE a.tenant_id = t.id AND a.created_at >= DATE_FORMAT(NOW(3), '%Y-%m-01')) AS ai_calls_month,
         (SELECT COALESCE(SUM(cost_usd), 0) FROM ai_usage a WHERE a.tenant_id = t.id AND a.created_at >= DATE_FORMAT(NOW(3), '%Y-%m-01')) AS ai_cost_month
  FROM tenants t JOIN plans pl ON pl.id = t.plan_id WHERE t.id = v_id;
  SELECT u.uuid, u.name, u.email, r.code AS role, u.status, u.last_login_at, u.created_at
  FROM users u JOIN roles r ON r.id = u.role_id WHERE u.tenant_id = v_id AND u.deleted_at IS NULL ORDER BY r.rank_level DESC;
END$$
DELIMITER ;
