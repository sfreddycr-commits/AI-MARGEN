
DROP PROCEDURE IF EXISTS sp_ai_draft_get;

DELIMITER $$
CREATE PROCEDURE sp_ai_draft_get(IN p_tenant_id BIGINT UNSIGNED, IN p_uuid CHAR(36))
  READS SQL DATA
BEGIN
  SELECT d.uuid, d.kind, d.payload, d.status, d.result_uuid, d.expires_at, d.created_at, d.confirmed_at,
         doc.uuid AS document_uuid, u.uuid AS user_uuid, (d.expires_at <= NOW(3)) AS is_expired
  FROM ai_drafts d
  JOIN users u ON u.id = d.user_id
  LEFT JOIN uploaded_documents doc ON doc.tenant_id = d.tenant_id AND doc.id = d.document_id
  WHERE d.tenant_id = p_tenant_id AND d.uuid = p_uuid;
END$$
DELIMITER ;
