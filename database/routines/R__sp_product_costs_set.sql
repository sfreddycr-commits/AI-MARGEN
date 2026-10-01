-- Persiste costos calculados por el motor: [{uuid, cost_total, cost_per_portion, complete}]

DROP PROCEDURE IF EXISTS sp_product_costs_set;

DELIMITER $$
CREATE PROCEDURE sp_product_costs_set(IN p_tenant_id BIGINT UNSIGNED, IN p_costs JSON)
  MODIFIES SQL DATA
BEGIN
  UPDATE products p
  JOIN JSON_TABLE(p_costs, '$[*]' COLUMNS (
    u CHAR(36) COLLATE utf8mb4_0900_ai_ci PATH '$.uuid', total DECIMAL(18,6) PATH '$.cost_total',
    per DECIMAL(18,6) PATH '$.cost_per_portion', complete TINYINT PATH '$.complete'
  )) j ON j.u = p.uuid
  SET p.cost_total = j.total, p.cost_per_portion = j.per, p.cost_complete = j.complete,
      p.costed_at = NOW(3), p.row_version = p.row_version + 1
  WHERE p.tenant_id = p_tenant_id;
  CALL sp_sync_bump_version(p_tenant_id, 'products');
END$$
DELIMITER ;
