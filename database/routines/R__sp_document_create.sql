
DROP PROCEDURE IF EXISTS sp_document_create;

DELIMITER $$
CREATE PROCEDURE sp_document_create(
  IN p_tenant_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED, IN p_kind VARCHAR(20), IN p_storage_key VARCHAR(255),
  IN p_original_name VARCHAR(255), IN p_mime VARCHAR(100), IN p_size INT UNSIGNED, IN p_sha256 CHAR(64)
)
  MODIFIES SQL DATA
BEGIN
  INSERT INTO uploaded_documents (tenant_id, kind, storage_key, original_name, mime_type, size_bytes, sha256, created_by)
  VALUES (p_tenant_id, p_kind, p_storage_key, LEFT(p_original_name, 255), p_mime, p_size, p_sha256, p_user_id);
  SELECT uuid FROM uploaded_documents WHERE id = LAST_INSERT_ID();
END$$
DELIMITER ;
