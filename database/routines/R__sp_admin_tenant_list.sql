-- scope: global — panel super_admin (SOP §11).

DROP PROCEDURE IF EXISTS sp_admin_tenant_list;

DELIMITER $$
CREATE PROCEDURE sp_admin_tenant_list(IN p_search VARCHAR(120), IN p_status VARCHAR(20), IN p_limit INT UNSIGNED, IN p_offset INT UNSIGNED)
  READS SQL DATA
BEGIN
  SELECT t.uuid, t.name, t.slug, t.email, t.status, pl.code AS plan, t.is_demo, t.created_at, t.last_activity_at,
         t.onboarding_completed_at,
         (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.deleted_at IS NULL) AS users_count,
         (SELECT COUNT(*) FROM products p WHERE p.tenant_id = t.id AND p.deleted_at IS NULL) AS products_count
  FROM tenants t JOIN plans pl ON pl.id = t.plan_id
  WHERE (p_search IS NULL OR t.name LIKE CONCAT('%', p_search, '%') OR t.email LIKE CONCAT('%', p_search, '%') OR t.slug LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR t.status = p_status)
  ORDER BY t.created_at DESC LIMIT p_limit OFFSET p_offset;
  SELECT COUNT(*) AS total FROM tenants t
  WHERE (p_search IS NULL OR t.name LIKE CONCAT('%', p_search, '%') OR t.email LIKE CONCAT('%', p_search, '%') OR t.slug LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR t.status = p_status);
END$$
DELIMITER ;
