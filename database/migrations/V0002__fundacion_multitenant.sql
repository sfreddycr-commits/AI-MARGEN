-- V0002 — Fundación multi-tenant
-- Tablas: plans, tenants, subscriptions, roles, permissions, role_permissions, users,
--         user_sessions, tenant_settings, tenant_data_versions, feature_flags,
--         tenant_feature_flags, audit_logs
-- Convenciones: database/docs/conventions.md

-- ---------------------------------------------------------------------------
-- Planes (SOP §49: preparados, sin precios fijados)
-- ---------------------------------------------------------------------------
CREATE TABLE plans (
  id            SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          VARCHAR(40)  NOT NULL,
  name          VARCHAR(80)  NOT NULL,
  -- Límites por recurso, ej. {"users": 3, "products": 100}. NULL = sin límite.
  limits        JSON NULL,
  status        ENUM('active','retired') NOT NULL DEFAULT 'active',
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_plans_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Tenants (negocios)
-- ---------------------------------------------------------------------------
CREATE TABLE tenants (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                     CHAR(36)     NOT NULL DEFAULT (UUID()),
  name                     VARCHAR(120) NOT NULL,
  slug                     VARCHAR(80)  NOT NULL,
  legal_name               VARCHAR(160) NULL,
  email                    VARCHAR(190) NULL,
  phone                    VARCHAR(30)  NULL,
  business_type            ENUM('restaurant','soda','cafe','bakery','pastry','food_truck','catering','other') NULL,
  country                  CHAR(2)      NOT NULL DEFAULT 'CR',
  currency                 CHAR(3)      NOT NULL DEFAULT 'CRC',
  timezone                 VARCHAR(64)  NOT NULL DEFAULT 'America/Costa_Rica',
  status                   ENUM('active','suspended') NOT NULL DEFAULT 'active',
  plan_id                  SMALLINT UNSIGNED NOT NULL,
  is_demo                  TINYINT(1)   NOT NULL DEFAULT 0,
  onboarding_completed_at  DATETIME(3)  NULL,
  last_activity_at         DATETIME(3)  NULL,
  row_version              INT UNSIGNED NOT NULL DEFAULT 1,
  created_at               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at               DATETIME(3)  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tenants_uuid (uuid),
  UNIQUE KEY uq_tenants_slug (slug),
  KEY ix_tenants_status_created (status, created_at),
  CONSTRAINT fk_tenants_plan FOREIGN KEY (plan_id) REFERENCES plans (id),
  CONSTRAINT ck_tenants_currency CHECK (REGEXP_LIKE(currency, '^[A-Z]{3}$', 'c')),
  CONSTRAINT ck_tenants_country CHECK (REGEXP_LIKE(country, '^[A-Z]{2}$', 'c'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE subscriptions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  plan_id     SMALLINT UNSIGNED NOT NULL,
  status      ENUM('trial','active','past_due','cancelled') NOT NULL DEFAULT 'trial',
  started_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ends_at     DATETIME(3) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_subscriptions_tenant_status (tenant_id, status),
  CONSTRAINT fk_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Roles y permisos (SOP §5)
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(40) NOT NULL,
  name        VARCHAR(80) NOT NULL,
  is_global   TINYINT(1)  NOT NULL DEFAULT 0, -- 1 = rol de plataforma (super_admin), sin tenant
  rank_level  TINYINT UNSIGNED NOT NULL,      -- mayor = más privilegios; impide asignar roles superiores
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE permissions (
  id           SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code         VARCHAR(60)  NOT NULL, -- '<modulo>.<accion>'
  description  VARCHAR(160) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE role_permissions (
  role_id        SMALLINT UNSIGNED NOT NULL,
  permission_id  SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  KEY ix_role_permissions_permission (permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Usuarios y sesiones (ADR-0008)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                CHAR(36)     NOT NULL DEFAULT (UUID()),
  tenant_id           BIGINT UNSIGNED NULL, -- NULL solo para super_admin
  name                VARCHAR(120) NOT NULL,
  email               VARCHAR(190) NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  role_id             SMALLINT UNSIGNED NOT NULL,
  status              ENUM('active','blocked','invited') NOT NULL DEFAULT 'active',
  email_verified_at   DATETIME(3) NULL,
  last_login_at       DATETIME(3) NULL,
  failed_login_count  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until        DATETIME(3) NULL,
  row_version         INT UNSIGNED NOT NULL DEFAULT 1,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at          DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_uuid (uuid),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_tenant_status (tenant_id, status),
  KEY ix_users_role (role_id),
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_sessions (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                CHAR(36)  NOT NULL DEFAULT (UUID()),
  tenant_id           BIGINT UNSIGNED NULL,
  user_id             BIGINT UNSIGNED NOT NULL,
  family_uuid         CHAR(36)  NOT NULL,          -- cadena de rotación; reutilización revoca la familia
  refresh_token_hash  CHAR(64)  NOT NULL,          -- SHA-256 del token; nunca el token
  remember            TINYINT(1) NOT NULL DEFAULT 0,
  expires_at          DATETIME(3) NOT NULL,
  revoked_at          DATETIME(3) NULL,
  replaced_by_id      BIGINT UNSIGNED NULL,
  ip                  VARCHAR(45)  NULL,
  user_agent          VARCHAR(255) NULL,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_used_at        DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_sessions_uuid (uuid),
  UNIQUE KEY uq_user_sessions_token (refresh_token_hash),
  KEY ix_user_sessions_tenant_user (tenant_id, user_id),
  KEY ix_user_sessions_user_expires (user_id, expires_at),
  KEY ix_user_sessions_family (family_uuid),
  CONSTRAINT fk_user_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_user_sessions_replaced_by FOREIGN KEY (replaced_by_id) REFERENCES user_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Configuración por tenant (ADR-0009)
-- ---------------------------------------------------------------------------
CREATE TABLE tenant_settings (
  tenant_id                 BIGINT UNSIGNED NOT NULL,
  default_target_margin     DECIMAL(9,6) NULL,        -- fracción 0 ≤ m < 1; se define en onboarding
  operating_days_per_month  TINYINT UNSIGNED NULL,
  rounding_scale            TINYINT UNSIGNED NOT NULL DEFAULT 2,
  cost_method               ENUM('last_purchase','weighted_average') NOT NULL DEFAULT 'last_purchase',
  row_version               INT UNSIGNED NOT NULL DEFAULT 1,
  created_at                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (tenant_id),
  CONSTRAINT fk_tenant_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT ck_tenant_settings_margin CHECK (default_target_margin IS NULL OR (default_target_margin >= 0 AND default_target_margin < 1)),
  CONSTRAINT ck_tenant_settings_days CHECK (operating_days_per_month IS NULL OR operating_days_per_month BETWEEN 1 AND 31),
  CONSTRAINT ck_tenant_settings_scale CHECK (rounding_scale BETWEEN 0 AND 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Versiones de datos para delta sync (ADR-0007)
-- ---------------------------------------------------------------------------
CREATE TABLE tenant_data_versions (
  tenant_id   BIGINT UNSIGNED NOT NULL,
  entity      VARCHAR(40) NOT NULL,
  version     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (tenant_id, entity),
  CONSTRAINT fk_tenant_data_versions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Feature flags (SOP §11, §49)
-- ---------------------------------------------------------------------------
CREATE TABLE feature_flags (
  id               SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code             VARCHAR(60)  NOT NULL,
  description      VARCHAR(160) NOT NULL,
  default_enabled  TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_feature_flags_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tenant_feature_flags (
  tenant_id   BIGINT UNSIGNED NOT NULL,
  flag_id     SMALLINT UNSIGNED NOT NULL,
  enabled     TINYINT(1) NOT NULL,
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (tenant_id, flag_id),
  KEY ix_tenant_feature_flags_flag (flag_id),
  CONSTRAINT fk_tenant_feature_flags_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_tenant_feature_flags_flag FOREIGN KEY (flag_id) REFERENCES feature_flags (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Auditoría (SOP §35) — solo inserción; no existen SP de actualización ni borrado
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id    BIGINT UNSIGNED NULL, -- NULL para acciones de plataforma
  user_id      BIGINT UNSIGNED NULL, -- NULL para acciones del sistema
  action       VARCHAR(60)  NOT NULL, -- ej. 'ingredient.update', 'auth.login'
  entity       VARCHAR(60)  NULL,
  entity_uuid  CHAR(36)     NULL,
  before_json  JSON NULL,
  after_json   JSON NULL,
  ip           VARCHAR(45)  NULL,
  user_agent   VARCHAR(255) NULL,
  request_id   VARCHAR(64)  NULL, -- no-fk: identificador de solicitud HTTP, no es una tabla
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_audit_logs_tenant_created (tenant_id, created_at),
  KEY ix_audit_logs_tenant_entity (tenant_id, entity, entity_uuid),
  KEY ix_audit_logs_user_created (user_id, created_at),
  KEY ix_audit_logs_action_created (action, created_at),
  CONSTRAINT fk_audit_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
