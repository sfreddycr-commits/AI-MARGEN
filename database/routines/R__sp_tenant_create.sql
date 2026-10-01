-- scope: global — crea el negocio en el onboarding y asigna al usuario como propietario.

DROP PROCEDURE IF EXISTS sp_tenant_create;

DELIMITER $$
CREATE PROCEDURE sp_tenant_create(
  IN p_user_id BIGINT UNSIGNED, IN p_name VARCHAR(120), IN p_slug VARCHAR(80),
  IN p_business_type VARCHAR(20), IN p_country CHAR(2), IN p_currency CHAR(3), IN p_timezone VARCHAR(64),
  IN p_target_margin DECIMAL(9,6), IN p_days TINYINT UNSIGNED, IN p_is_demo TINYINT
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_tenant BIGINT UNSIGNED;
  DECLARE v_slug VARCHAR(80) DEFAULT p_slug;
  DECLARE v_has BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT tenant_id INTO v_has FROM users WHERE id = p_user_id FOR UPDATE;
  IF v_has IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT:tenant_exists';
  END IF;
  IF EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) THEN
    SET v_slug = CONCAT(LEFT(p_slug, 70), '-', LEFT(REPLACE(UUID(), '-', ''), 6));
  END IF;

  INSERT INTO tenants (name, slug, business_type, country, currency, timezone, plan_id, is_demo, email)
  SELECT p_name, v_slug, p_business_type, p_country, p_currency, p_timezone,
         (SELECT id FROM plans WHERE code = 'inicial'), p_is_demo, u.email
  FROM users u WHERE u.id = p_user_id;
  SET v_tenant = LAST_INSERT_ID();

  INSERT INTO tenant_settings (tenant_id, default_target_margin, operating_days_per_month)
  VALUES (v_tenant, p_target_margin, p_days);
  INSERT INTO subscriptions (tenant_id, plan_id, status)
  VALUES (v_tenant, (SELECT id FROM plans WHERE code = 'inicial'), 'trial');

  UPDATE users SET tenant_id = v_tenant, role_id = fn_role_id('tenant_owner'), row_version = row_version + 1
  WHERE id = p_user_id;
  UPDATE user_sessions SET tenant_id = v_tenant WHERE user_id = p_user_id AND revoked_at IS NULL;

  INSERT INTO ingredient_categories (tenant_id, name) VALUES
    (v_tenant, 'Carnes'), (v_tenant, 'Lácteos'), (v_tenant, 'Frutas y verduras'),
    (v_tenant, 'Abarrotes'), (v_tenant, 'Bebidas'), (v_tenant, 'Empaques');
  INSERT INTO product_categories (tenant_id, name) VALUES
    (v_tenant, 'Bebidas'), (v_tenant, 'Platos'), (v_tenant, 'Postres'), (v_tenant, 'Panadería');
  COMMIT;

  SELECT id, uuid FROM tenants WHERE id = v_tenant;
END$$
DELIMITER ;
