-- Forma estándar de una fila de proveedor. Los SP filtran siempre por tenant_id.

DROP VIEW IF EXISTS vw_supplier_rows;

CREATE VIEW vw_supplier_rows AS
SELECT s.id, s.tenant_id, s.uuid, s.name, s.contact_name, s.phone, s.email, s.notes, s.is_demo,
       s.row_version, s.created_at, s.updated_at, s.deleted_at,
       (SELECT COUNT(*) FROM purchases p WHERE p.tenant_id = s.tenant_id AND p.supplier_id = s.id AND p.voided_at IS NULL) AS purchases_count,
       (SELECT MAX(p.purchased_at) FROM purchases p WHERE p.tenant_id = s.tenant_id AND p.supplier_id = s.id AND p.voided_at IS NULL) AS last_purchase_at
FROM suppliers s;
