
DROP PROCEDURE IF EXISTS sp_fixed_cost_changes;

DELIMITER $$
CREATE PROCEDURE sp_fixed_cost_changes(
  IN p_tenant_id BIGINT UNSIGNED, IN p_since DATETIME(3), IN p_since_uuid CHAR(36), IN p_limit INT UNSIGNED
)
  READS SQL DATA
BEGIN
  SELECT * FROM vw_fixed_cost_rows
  WHERE tenant_id = p_tenant_id
    AND (p_since IS NULL OR updated_at > p_since OR (updated_at = p_since AND uuid > COALESCE(p_since_uuid, '')))
  ORDER BY updated_at, uuid LIMIT p_limit;
END$$
DELIMITER ;
