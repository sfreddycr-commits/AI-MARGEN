
DROP PROCEDURE IF EXISTS sp_document_get;

DELIMITER $$
CREATE PROCEDURE sp_document_get(IN p_tenant_id BIGINT UNSIGNED, IN p_uuid CHAR(36))
  READS SQL DATA
BEGIN
  SELECT uuid, kind, storage_key, original_name, mime_type, size_bytes, sha256, created_at
  FROM uploaded_documents WHERE tenant_id = p_tenant_id AND uuid = p_uuid AND deleted_at IS NULL;
END$$
DELIMITER ;
