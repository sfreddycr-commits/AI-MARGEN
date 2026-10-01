
DROP VIEW IF EXISTS vw_ingredient_rows;

CREATE VIEW vw_ingredient_rows AS
SELECT i.id, i.tenant_id, i.uuid, i.name, c.uuid AS category_uuid, c.name AS category_name,
       u.code AS unit, i.current_unit_cost, i.yield_fraction, s.uuid AS supplier_uuid, s.name AS supplier_name,
       i.last_cost_at, i.notes, i.is_demo, i.row_version, i.created_at, i.updated_at, i.deleted_at,
       (SELECT COUNT(DISTINCT ri.product_id) FROM recipe_items ri
         JOIN products p ON p.tenant_id = ri.tenant_id AND p.id = ri.product_id AND p.deleted_at IS NULL
        WHERE ri.tenant_id = i.tenant_id AND ri.ingredient_id = i.id) AS used_in_products,
       (SELECT JSON_ARRAYAGG(JSON_OBJECT('from', fu.code, 'to', tu.code, 'factor', CAST(uc.factor AS CHAR)))
          FROM unit_conversions uc
          JOIN units fu ON fu.id = uc.from_unit_id
          JOIN units tu ON tu.id = uc.to_unit_id
         WHERE uc.tenant_id = i.tenant_id AND uc.ingredient_id = i.id) AS conversions
FROM ingredients i
JOIN units u ON u.id = i.unit_id
LEFT JOIN ingredient_categories c ON c.tenant_id = i.tenant_id AND c.id = i.category_id
LEFT JOIN suppliers s ON s.tenant_id = i.tenant_id AND s.id = i.current_supplier_id;
