
DROP VIEW IF EXISTS vw_fixed_cost_rows;

CREATE VIEW vw_fixed_cost_rows AS
SELECT id, tenant_id, uuid, name, monthly_amount, notes, is_demo, row_version, created_at, updated_at, deleted_at
FROM fixed_costs;
