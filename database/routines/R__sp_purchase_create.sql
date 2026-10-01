-- Registra una compra con sus líneas en una transacción. Los costos unitarios llegan calculados
-- por el motor (p_items: [{ingredient_uuid, quantity, unit, line_total, unit_cost, quantity_base}]).
-- Agrega cada línea al historial y actualiza el costo vigente sin destruir historial (SOP §14).

DROP PROCEDURE IF EXISTS sp_purchase_create;

DELIMITER $$
CREATE PROCEDURE sp_purchase_create(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_supplier_uuid CHAR(36),
  IN p_purchased_at DATE, IN p_reference VARCHAR(60), IN p_notes VARCHAR(500), IN p_total DECIMAL(18,6),
  IN p_source VARCHAR(20), IN p_document_uuid CHAR(36), IN p_items JSON, IN p_is_demo TINYINT
)
  MODIFIES SQL DATA
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_sup BIGINT UNSIGNED DEFAULT fn_supplier_id(p_tenant_id, p_supplier_uuid);
  DECLARE v_doc BIGINT UNSIGNED;
  DECLARE v_lines INT;
  DECLARE v_valid INT;
  DECLARE v_effective DATETIME(3) DEFAULT IF(p_purchased_at = CURDATE(), NOW(3), TIMESTAMP(p_purchased_at, '12:00:00'));
  DECLARE v_ids JSON;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF p_document_uuid IS NOT NULL THEN
    SELECT id INTO v_doc FROM uploaded_documents WHERE tenant_id = p_tenant_id AND uuid = p_document_uuid;
    IF v_doc IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:document'; END IF;
  END IF;

  SELECT JSON_LENGTH(p_items) INTO v_lines;
  IF v_lines IS NULL OR v_lines = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:items'; END IF;
  SELECT COUNT(*) INTO v_valid
  FROM JSON_TABLE(p_items, '$[*]' COLUMNS (u CHAR(36) COLLATE utf8mb4_0900_ai_ci PATH '$.ingredient_uuid', unit VARCHAR(10) COLLATE utf8mb4_0900_ai_ci PATH '$.unit')) j
  JOIN ingredients i ON i.tenant_id = p_tenant_id AND i.uuid = j.u AND i.deleted_at IS NULL
  JOIN units un ON un.code = j.unit;
  IF v_valid <> v_lines THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERR_VALIDATION:ingredient'; END IF;

  START TRANSACTION;
  INSERT INTO purchases (tenant_id, supplier_id, purchased_at, reference, notes, total, source, document_id, is_demo, created_by)
  VALUES (p_tenant_id, v_sup, p_purchased_at, p_reference, p_notes, p_total, p_source, v_doc, COALESCE(p_is_demo, 0), p_user_id);
  SET v_id = LAST_INSERT_ID();

  INSERT INTO purchase_items (tenant_id, purchase_id, ingredient_id, quantity, unit_id, line_total, unit_cost, position)
  SELECT p_tenant_id, v_id, i.id, j.quantity, un.id, j.line_total, j.unit_cost, j.pos
  FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
    pos FOR ORDINALITY,
    u CHAR(36) COLLATE utf8mb4_0900_ai_ci PATH '$.ingredient_uuid', quantity DECIMAL(18,6) PATH '$.quantity', unit VARCHAR(10) COLLATE utf8mb4_0900_ai_ci PATH '$.unit',
    line_total DECIMAL(18,6) PATH '$.line_total', unit_cost DECIMAL(18,6) PATH '$.unit_cost'
  )) j
  JOIN ingredients i ON i.tenant_id = p_tenant_id AND i.uuid = j.u
  JOIN units un ON un.code = j.unit;

  INSERT INTO ingredient_price_history (tenant_id, ingredient_id, supplier_id, purchase_item_id, unit_cost, quantity, source, effective_at, created_by)
  SELECT p_tenant_id, pi.ingredient_id, v_sup, pi.id, pi.unit_cost, j.quantity_base,
         IF(p_source = 'invoice_ai', 'invoice_ai', 'purchase'), v_effective, p_user_id
  FROM purchase_items pi
  JOIN JSON_TABLE(p_items, '$[*]' COLUMNS (pos FOR ORDINALITY, quantity_base DECIMAL(18,6) PATH '$.quantity_base')) j
    ON j.pos = pi.position
  WHERE pi.tenant_id = p_tenant_id AND pi.purchase_id = v_id;

  SELECT JSON_ARRAYAGG(x.ingredient_id) INTO v_ids
  FROM (SELECT DISTINCT ingredient_id FROM purchase_items WHERE tenant_id = p_tenant_id AND purchase_id = v_id) x;
  CALL sp_ingredient_recalc_current(p_tenant_id, v_ids);
  CALL sp_sync_bump_version(p_tenant_id, 'purchases');
  COMMIT;

  SELECT p.id, p.uuid, v_ids AS ingredient_ids FROM purchases p WHERE p.id = v_id;
END$$
DELIMITER ;
