
DROP PROCEDURE IF EXISTS sp_tenant_get;

DELIMITER $$
CREATE PROCEDURE sp_tenant_get(IN p_tenant_id BIGINT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT t.uuid, t.name, t.slug, t.legal_name, t.email, t.phone, t.business_type, t.country,
         t.currency, t.timezone, t.status, p.code AS plan, t.is_demo, t.onboarding_completed_at,
         t.row_version, t.created_at,
         s.default_target_margin, s.operating_days_per_month, s.rounding_scale, s.cost_method,
         s.row_version AS settings_row_version
  FROM tenants t
  JOIN plans p ON p.id = t.plan_id
  JOIN tenant_settings s ON s.tenant_id = t.id
  WHERE t.id = p_tenant_id;
END$$
DELIMITER ;
