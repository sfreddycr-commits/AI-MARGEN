-- Anula una compra: no se borra; se marca y se excluye del costo vigente.

DROP PROCEDURE IF EXISTS sp_purchase_void;

DELIMITER $$
CREATE PROCEDURE sp_purchase_void(IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_uuid CHAR(36))
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_voided DATETIME(3);
  DECLARE v_ids JSON;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT id, voided_at INTO v_id, v_voided FROM purchases WHERE tenant_id = p_tenant_id AND uuid = p_uuid FOR UPDATE;
  IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_NOT_FOUND'; END IF;
  IF v_voided IS NOT NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_CONFLICT:already_void'; END IF;

  UPDATE purchases SET voided_at = NOW(3), voided_by = p_user_id, row_version = row_version + 1 WHERE id = v_id;
  UPDATE ingredient_price_history h
  JOIN purchase_items pi ON pi.tenant_id = h.tenant_id AND pi.id = h.purchase_item_id
  SET h.voided_at = NOW(3)
  WHERE h.tenant_id = p_tenant_id AND pi.purchase_id = v_id;

  SELECT JSON_ARRAYAGG(x.ingredient_id) INTO v_ids
  FROM (SELECT DISTINCT ingredient_id FROM purchase_items WHERE tenant_id = p_tenant_id AND purchase_id = v_id) x;
  CALL sp_ingredient_recalc_current(p_tenant_id, v_ids);
  CALL sp_sync_bump_version(p_tenant_id, 'purchases');
  COMMIT;
  SELECT v_ids AS ingredient_ids;
END$$
DELIMITER ;
