-- Conteos para KPIs y alertas. Las cifras financieras se calculan en la API con el motor.

DROP PROCEDURE IF EXISTS sp_dashboard_counts;

DELIMITER $$
CREATE PROCEDURE sp_dashboard_counts(IN p_tenant_id BIGINT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT
    (SELECT COUNT(*) FROM products WHERE tenant_id = p_tenant_id AND deleted_at IS NULL) AS products_active,
    (SELECT COUNT(*) FROM products WHERE tenant_id = p_tenant_id AND deleted_at IS NULL
       AND (current_price IS NULL OR current_price = 0)) AS products_no_price,
    (SELECT COUNT(*) FROM products WHERE tenant_id = p_tenant_id AND deleted_at IS NULL AND cost_complete = 0) AS products_incomplete,
    (SELECT COUNT(*) FROM products p WHERE p.tenant_id = p_tenant_id AND p.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM recipe_items ri WHERE ri.tenant_id = p.tenant_id AND ri.product_id = p.id)) AS products_no_recipe,
    (SELECT COUNT(*) FROM ingredients WHERE tenant_id = p_tenant_id AND deleted_at IS NULL) AS ingredients_active,
    (SELECT COUNT(*) FROM ingredients WHERE tenant_id = p_tenant_id AND deleted_at IS NULL AND current_unit_cost IS NULL) AS ingredients_missing_cost,
    (SELECT COUNT(*) FROM suppliers WHERE tenant_id = p_tenant_id AND deleted_at IS NULL) AS suppliers_active,
    (SELECT COUNT(*) FROM purchases WHERE tenant_id = p_tenant_id AND voided_at IS NULL) AS purchases_count,
    (SELECT COUNT(*) FROM scenarios WHERE tenant_id = p_tenant_id AND deleted_at IS NULL) AS scenarios_count;
END$$
DELIMITER ;
