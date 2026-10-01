
DROP VIEW IF EXISTS vw_scenario_rows;

CREATE VIEW vw_scenario_rows AS
SELECT s.id, s.tenant_id, s.uuid, s.name, p.uuid AS product_uuid, p.name AS product_name,
       s.price, s.units_per_day, s.days_per_month, s.fixed_costs, s.variable_unit_cost, s.variable_source,
       s.notes, s.is_demo, s.row_version, s.created_at, s.updated_at, s.deleted_at
FROM scenarios s
LEFT JOIN products p ON p.tenant_id = s.tenant_id AND p.id = s.product_id;
