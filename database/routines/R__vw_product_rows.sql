
DROP VIEW IF EXISTS vw_product_rows;

CREATE VIEW vw_product_rows AS
SELECT p.id, p.tenant_id, p.uuid, p.name, c.uuid AS category_uuid, c.name AS category_name,
       p.portions, p.current_price, p.target_margin,
       COALESCE(p.target_margin, ts.default_target_margin) AS effective_target_margin,
       p.multiplier, p.packaging_mode, p.packaging_value, p.labor_mode, p.labor_value,
       p.overhead_mode, p.overhead_value, p.waste_pct, p.notes,
       p.cost_total, p.cost_per_portion, p.cost_complete, p.costed_at, p.is_demo,
       p.row_version, p.created_at, p.updated_at, p.deleted_at,
       (SELECT COUNT(*) FROM recipe_items ri WHERE ri.tenant_id = p.tenant_id AND ri.product_id = p.id) AS items_count
FROM products p
JOIN tenant_settings ts ON ts.tenant_id = p.tenant_id
LEFT JOIN product_categories c ON c.tenant_id = p.tenant_id AND c.id = p.category_id;
