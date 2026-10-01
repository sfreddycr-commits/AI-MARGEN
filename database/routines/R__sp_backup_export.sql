-- Respaldo completo del negocio (SOP §36). Un result set por entidad, con uuids como referencias.

DROP PROCEDURE IF EXISTS sp_backup_export;

DELIMITER $$
CREATE PROCEDURE sp_backup_export(IN p_tenant_id BIGINT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT t.uuid, t.name, t.legal_name, t.email, t.phone, t.business_type, t.country, t.currency, t.timezone, t.created_at,
         s.default_target_margin, s.operating_days_per_month, s.rounding_scale, s.cost_method
  FROM tenants t JOIN tenant_settings s ON s.tenant_id = t.id WHERE t.id = p_tenant_id;
  SELECT 'ingredient' AS kind, uuid, name, deleted_at FROM ingredient_categories WHERE tenant_id = p_tenant_id
  UNION ALL
  SELECT 'product', uuid, name, deleted_at FROM product_categories WHERE tenant_id = p_tenant_id;
  SELECT uuid, name, contact_name, phone, email, notes, is_demo, created_at, deleted_at FROM suppliers WHERE tenant_id = p_tenant_id;
  SELECT uuid, name, category_uuid, unit, current_unit_cost, yield_fraction, supplier_uuid, last_cost_at, notes, conversions,
         is_demo, created_at, deleted_at FROM vw_ingredient_rows WHERE tenant_id = p_tenant_id;
  SELECT i.uuid AS ingredient_uuid, s.uuid AS supplier_uuid, h.unit_cost, h.quantity, h.source, h.effective_at, h.voided_at
  FROM ingredient_price_history h
  JOIN ingredients i ON i.tenant_id = h.tenant_id AND i.id = h.ingredient_id
  LEFT JOIN suppliers s ON s.tenant_id = h.tenant_id AND s.id = h.supplier_id
  WHERE h.tenant_id = p_tenant_id ORDER BY h.effective_at;
  SELECT p.uuid, s.uuid AS supplier_uuid, p.purchased_at, p.reference, p.notes, p.total, p.source, p.voided_at, p.is_demo, p.created_at
  FROM purchases p LEFT JOIN suppliers s ON s.tenant_id = p.tenant_id AND s.id = p.supplier_id
  WHERE p.tenant_id = p_tenant_id ORDER BY p.purchased_at;
  SELECT p.uuid AS purchase_uuid, i.uuid AS ingredient_uuid, pi.quantity, u.code AS unit, pi.line_total, pi.unit_cost
  FROM purchase_items pi
  JOIN purchases p ON p.tenant_id = pi.tenant_id AND p.id = pi.purchase_id
  JOIN ingredients i ON i.tenant_id = pi.tenant_id AND i.id = pi.ingredient_id
  JOIN units u ON u.id = pi.unit_id
  WHERE pi.tenant_id = p_tenant_id ORDER BY p.purchased_at, pi.position;
  SELECT uuid, name, category_uuid, portions, current_price, target_margin, multiplier, packaging_mode, packaging_value,
         labor_mode, labor_value, overhead_mode, overhead_value, waste_pct, notes, cost_total, cost_per_portion,
         cost_complete, is_demo, created_at, deleted_at
  FROM vw_product_rows WHERE tenant_id = p_tenant_id;
  SELECT p.uuid AS product_uuid, i.uuid AS ingredient_uuid, ri.quantity, u.code AS unit, ri.position
  FROM recipe_items ri
  JOIN products p ON p.tenant_id = ri.tenant_id AND p.id = ri.product_id
  JOIN ingredients i ON i.tenant_id = ri.tenant_id AND i.id = ri.ingredient_id
  JOIN units u ON u.id = ri.unit_id
  WHERE ri.tenant_id = p_tenant_id ORDER BY p.uuid, ri.position;
  SELECT uuid, name, monthly_amount, notes, is_demo, deleted_at FROM fixed_costs WHERE tenant_id = p_tenant_id;
  SELECT uuid, name, product_uuid, price, units_per_day, days_per_month, fixed_costs, variable_unit_cost,
         variable_source, notes, is_demo, deleted_at
  FROM vw_scenario_rows WHERE tenant_id = p_tenant_id;
END$$
DELIMITER ;
