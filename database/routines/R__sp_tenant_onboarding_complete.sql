
DROP PROCEDURE IF EXISTS sp_tenant_onboarding_complete;

DELIMITER $$
CREATE PROCEDURE sp_tenant_onboarding_complete(IN p_tenant_id BIGINT UNSIGNED)
  MODIFIES SQL DATA
BEGIN
  UPDATE tenants SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW(3)),
         row_version = row_version + 1
  WHERE id = p_tenant_id;
  CALL sp_sync_bump_version(p_tenant_id, 'settings');
END$$
DELIMITER ;
