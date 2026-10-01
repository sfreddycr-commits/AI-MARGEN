-- V0004 — Esquema de negocio
-- Integridad multi-tenant en la propia BD: las tablas padre exponen UNIQUE (tenant_id, id) y las
-- hijas referencian (tenant_id, <padre>_id). Así es imposible que un registro de un negocio apunte
-- a otro negocio aunque un SP tuviera un error (riesgo R4).
-- Nombres únicos solo entre registros activos: columna generada `name_active` (NULL si archivado).

-- ---------------------------------------------------------------------------
-- Tokens de un solo uso (verificación de correo, recuperación, invitación)
-- ---------------------------------------------------------------------------
CREATE TABLE user_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  purpose     ENUM('verify_email','reset_password','invite') NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME(3) NOT NULL,
  used_at     DATETIME(3) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_tokens_hash (token_hash),
  KEY ix_user_tokens_user_purpose (user_id, purpose),
  CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Unidades (referencia global, SOP §12)
-- ---------------------------------------------------------------------------
CREATE TABLE units (
  id              TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(10)  NOT NULL,
  name            VARCHAR(40)  NOT NULL,
  dimension       ENUM('mass','volume','count') NOT NULL,
  factor_to_base  DECIMAL(18,6) NOT NULL,
  sort_order      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_units_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO units (code, name, dimension, factor_to_base, sort_order) VALUES
  ('g', 'gramos', 'mass', 1, 1),
  ('kg', 'kilogramos', 'mass', 1000, 2),
  ('ml', 'mililitros', 'volume', 1, 3),
  ('l', 'litros', 'volume', 1000, 4),
  ('unidad', 'unidades', 'count', 1, 5);

-- Habilita FKs compuestas (tenant_id, id) hacia tenants desde tablas de referencia por tenant
ALTER TABLE users ADD UNIQUE KEY uq_users_tenant_id (tenant_id, id);

-- ---------------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------------
CREATE TABLE ingredient_categories (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid         CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id    BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(80) NOT NULL,
  name_active  VARCHAR(80) GENERATED ALWAYS AS (IF(deleted_at IS NULL, name, NULL)) VIRTUAL,
  row_version  INT UNSIGNED NOT NULL DEFAULT 1,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at   DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ingredient_categories_uuid (uuid),
  UNIQUE KEY uq_ingredient_categories_tenant_id (tenant_id, id),
  UNIQUE KEY uq_ingredient_categories_tenant_name (tenant_id, name_active),
  KEY ix_ingredient_categories_tenant_updated (tenant_id, updated_at),
  CONSTRAINT fk_ingredient_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE product_categories (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid         CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id    BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(80) NOT NULL,
  name_active  VARCHAR(80) GENERATED ALWAYS AS (IF(deleted_at IS NULL, name, NULL)) VIRTUAL,
  row_version  INT UNSIGNED NOT NULL DEFAULT 1,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at   DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_categories_uuid (uuid),
  UNIQUE KEY uq_product_categories_tenant_id (tenant_id, id),
  UNIQUE KEY uq_product_categories_tenant_name (tenant_id, name_active),
  KEY ix_product_categories_tenant_updated (tenant_id, updated_at),
  CONSTRAINT fk_product_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Proveedores (SOP §13)
-- ---------------------------------------------------------------------------
CREATE TABLE suppliers (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid          CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id     BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(120) NOT NULL,
  name_active   VARCHAR(120) GENERATED ALWAYS AS (IF(deleted_at IS NULL, name, NULL)) VIRTUAL,
  contact_name  VARCHAR(120) NULL,
  phone         VARCHAR(30)  NULL,
  email         VARCHAR(190) NULL,
  notes         VARCHAR(500) NULL,
  is_demo       TINYINT(1) NOT NULL DEFAULT 0,
  row_version   INT UNSIGNED NOT NULL DEFAULT 1,
  created_by    BIGINT UNSIGNED NULL,
  updated_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at    DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_suppliers_uuid (uuid),
  UNIQUE KEY uq_suppliers_tenant_id (tenant_id, id),
  UNIQUE KEY uq_suppliers_tenant_name (tenant_id, name_active),
  KEY ix_suppliers_tenant_updated (tenant_id, updated_at),
  KEY ix_suppliers_tenant_name (tenant_id, name),
  KEY ix_suppliers_created_by (created_by),
  KEY ix_suppliers_updated_by (updated_by),
  CONSTRAINT fk_suppliers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_suppliers_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_suppliers_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Ingredientes e insumos (SOP §12)
-- unit_id es la unidad de costeo; current_unit_cost es el costo por esa unidad.
-- yield_fraction = rendimiento (1 − merma del ingrediente), 0 < r ≤ 1 (ADR-0009).
-- ---------------------------------------------------------------------------
CREATE TABLE ingredients (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                 CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id            BIGINT UNSIGNED NOT NULL,
  name                 VARCHAR(120) NOT NULL,
  name_active          VARCHAR(120) GENERATED ALWAYS AS (IF(deleted_at IS NULL, name, NULL)) VIRTUAL,
  category_id          BIGINT UNSIGNED NULL,
  unit_id              TINYINT UNSIGNED NOT NULL,
  current_unit_cost    DECIMAL(18,6) NULL,
  yield_fraction       DECIMAL(9,6) NOT NULL DEFAULT 1,
  current_supplier_id  BIGINT UNSIGNED NULL,
  last_cost_at         DATETIME(3) NULL,
  notes                VARCHAR(500) NULL,
  is_demo              TINYINT(1) NOT NULL DEFAULT 0,
  row_version          INT UNSIGNED NOT NULL DEFAULT 1,
  created_by           BIGINT UNSIGNED NULL,
  updated_by           BIGINT UNSIGNED NULL,
  created_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at           DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ingredients_uuid (uuid),
  UNIQUE KEY uq_ingredients_tenant_id (tenant_id, id),
  UNIQUE KEY uq_ingredients_tenant_name (tenant_id, name_active),
  KEY ix_ingredients_tenant_updated (tenant_id, updated_at),
  KEY ix_ingredients_tenant_name (tenant_id, name),
  KEY ix_ingredients_tenant_category (tenant_id, category_id),
  KEY ix_ingredients_tenant_supplier (tenant_id, current_supplier_id),
  KEY ix_ingredients_unit (unit_id),
  KEY ix_ingredients_created_by (created_by),
  KEY ix_ingredients_updated_by (updated_by),
  CONSTRAINT fk_ingredients_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_ingredients_category FOREIGN KEY (tenant_id, category_id) REFERENCES ingredient_categories (tenant_id, id),
  CONSTRAINT fk_ingredients_supplier FOREIGN KEY (tenant_id, current_supplier_id) REFERENCES suppliers (tenant_id, id),
  CONSTRAINT fk_ingredients_unit FOREIGN KEY (unit_id) REFERENCES units (id),
  CONSTRAINT fk_ingredients_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_ingredients_updated_by FOREIGN KEY (updated_by) REFERENCES users (id),
  CONSTRAINT ck_ingredients_cost CHECK (current_unit_cost IS NULL OR current_unit_cost >= 0),
  CONSTRAINT ck_ingredients_yield CHECK (yield_fraction > 0 AND yield_fraction <= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Conversión propia entre dimensiones: 1 from_unit = factor to_unit (ej. 1 unidad = 50 g)
CREATE TABLE unit_conversions (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  ingredient_id  BIGINT UNSIGNED NOT NULL,
  from_unit_id   TINYINT UNSIGNED NOT NULL,
  to_unit_id     TINYINT UNSIGNED NOT NULL,
  factor         DECIMAL(18,6) NOT NULL,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_unit_conversions_pair (tenant_id, ingredient_id, from_unit_id, to_unit_id),
  KEY ix_unit_conversions_from (from_unit_id),
  KEY ix_unit_conversions_to (to_unit_id),
  CONSTRAINT fk_unit_conversions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_unit_conversions_ingredient FOREIGN KEY (tenant_id, ingredient_id) REFERENCES ingredients (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_unit_conversions_from FOREIGN KEY (from_unit_id) REFERENCES units (id),
  CONSTRAINT fk_unit_conversions_to FOREIGN KEY (to_unit_id) REFERENCES units (id),
  CONSTRAINT ck_unit_conversions_factor CHECK (factor > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Documentos subidos (facturas)
-- ---------------------------------------------------------------------------
CREATE TABLE uploaded_documents (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid           CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id      BIGINT UNSIGNED NOT NULL,
  kind           ENUM('invoice') NOT NULL,
  storage_key    VARCHAR(255) NOT NULL,
  original_name  VARCHAR(255) NULL,
  mime_type      VARCHAR(100) NOT NULL,
  size_bytes     INT UNSIGNED NOT NULL,
  sha256         CHAR(64) NOT NULL,
  created_by     BIGINT UNSIGNED NULL,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at     DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_uploaded_documents_uuid (uuid),
  UNIQUE KEY uq_uploaded_documents_tenant_id (tenant_id, id),
  KEY ix_uploaded_documents_tenant_created (tenant_id, created_at),
  KEY ix_uploaded_documents_created_by (created_by),
  CONSTRAINT fk_uploaded_documents_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_uploaded_documents_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Compras (SOP §14). No se editan: se anulan y se registran de nuevo (trazabilidad).
-- ---------------------------------------------------------------------------
CREATE TABLE purchases (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid          CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id     BIGINT UNSIGNED NOT NULL,
  supplier_id   BIGINT UNSIGNED NULL,
  purchased_at  DATE NOT NULL,
  reference     VARCHAR(60) NULL, -- número de factura
  notes         VARCHAR(500) NULL,
  total         DECIMAL(18,6) NOT NULL,
  source        ENUM('manual','invoice_ai') NOT NULL DEFAULT 'manual',
  document_id   BIGINT UNSIGNED NULL,
  voided_at     DATETIME(3) NULL,
  voided_by     BIGINT UNSIGNED NULL,
  is_demo       TINYINT(1) NOT NULL DEFAULT 0,
  row_version   INT UNSIGNED NOT NULL DEFAULT 1,
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchases_uuid (uuid),
  UNIQUE KEY uq_purchases_tenant_id (tenant_id, id),
  KEY ix_purchases_tenant_date (tenant_id, purchased_at),
  KEY ix_purchases_tenant_supplier_date (tenant_id, supplier_id, purchased_at),
  KEY ix_purchases_tenant_updated (tenant_id, updated_at),
  KEY ix_purchases_document (tenant_id, document_id),
  KEY ix_purchases_created_by (created_by),
  KEY ix_purchases_voided_by (voided_by),
  CONSTRAINT fk_purchases_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_purchases_supplier FOREIGN KEY (tenant_id, supplier_id) REFERENCES suppliers (tenant_id, id),
  CONSTRAINT fk_purchases_document FOREIGN KEY (tenant_id, document_id) REFERENCES uploaded_documents (tenant_id, id),
  CONSTRAINT fk_purchases_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_purchases_voided_by FOREIGN KEY (voided_by) REFERENCES users (id),
  CONSTRAINT ck_purchases_total CHECK (total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE purchase_items (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  purchase_id    BIGINT UNSIGNED NOT NULL,
  ingredient_id  BIGINT UNSIGNED NOT NULL,
  quantity       DECIMAL(18,6) NOT NULL,
  unit_id        TINYINT UNSIGNED NOT NULL,
  line_total     DECIMAL(18,6) NOT NULL,
  unit_cost      DECIMAL(18,6) NOT NULL, -- en la unidad de costeo del ingrediente (calculado por el motor)
  position       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_items_tenant_id (tenant_id, id),
  KEY ix_purchase_items_tenant_purchase (tenant_id, purchase_id),
  KEY ix_purchase_items_tenant_ingredient (tenant_id, ingredient_id),
  KEY ix_purchase_items_unit (unit_id),
  CONSTRAINT fk_purchase_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_purchase_items_purchase FOREIGN KEY (tenant_id, purchase_id) REFERENCES purchases (tenant_id, id),
  CONSTRAINT fk_purchase_items_ingredient FOREIGN KEY (tenant_id, ingredient_id) REFERENCES ingredients (tenant_id, id),
  CONSTRAINT fk_purchase_items_unit FOREIGN KEY (unit_id) REFERENCES units (id),
  CONSTRAINT ck_purchase_items_qty CHECK (quantity > 0),
  CONSTRAINT ck_purchase_items_total CHECK (line_total >= 0 AND unit_cost >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Historial de costos: nunca se borra; las anulaciones se marcan (SOP §14, regla 19)
CREATE TABLE ingredient_price_history (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id         BIGINT UNSIGNED NOT NULL,
  ingredient_id     BIGINT UNSIGNED NOT NULL,
  supplier_id       BIGINT UNSIGNED NULL,
  purchase_item_id  BIGINT UNSIGNED NULL,
  unit_cost         DECIMAL(18,6) NOT NULL,
  quantity          DECIMAL(18,6) NULL, -- en la unidad del ingrediente (para promedio ponderado)
  source            ENUM('manual','purchase','invoice_ai') NOT NULL,
  effective_at      DATETIME(3) NOT NULL,
  voided_at         DATETIME(3) NULL,
  created_by        BIGINT UNSIGNED NULL,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_price_history_tenant_ingredient_date (tenant_id, ingredient_id, effective_at),
  KEY ix_price_history_tenant_supplier_date (tenant_id, supplier_id, effective_at),
  KEY ix_price_history_tenant_item (tenant_id, purchase_item_id),
  KEY ix_price_history_created_by (created_by),
  CONSTRAINT fk_price_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_price_history_ingredient FOREIGN KEY (tenant_id, ingredient_id) REFERENCES ingredients (tenant_id, id),
  CONSTRAINT fk_price_history_supplier FOREIGN KEY (tenant_id, supplier_id) REFERENCES suppliers (tenant_id, id),
  CONSTRAINT fk_price_history_item FOREIGN KEY (tenant_id, purchase_item_id) REFERENCES purchase_items (tenant_id, id),
  CONSTRAINT fk_price_history_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT ck_price_history_cost CHECK (unit_cost >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Productos y recetas (SOP §15). La receta es 1:1 con el producto: recipe_items cuelga del producto.
-- Componentes (empaque, mano de obra, indirectos): modo fijo o % sobre ingredientes (ADR-0009).
-- cost_* son resultados del motor de cálculo persistidos para listados, KPIs y alertas.
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid              CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id         BIGINT UNSIGNED NOT NULL,
  name              VARCHAR(120) NOT NULL,
  name_active       VARCHAR(120) GENERATED ALWAYS AS (IF(deleted_at IS NULL, name, NULL)) VIRTUAL,
  category_id       BIGINT UNSIGNED NULL,
  portions          DECIMAL(12,4) NOT NULL DEFAULT 1,
  current_price     DECIMAL(18,6) NULL,
  target_margin     DECIMAL(9,6) NULL, -- NULL = usa el margen objetivo del negocio
  multiplier        DECIMAL(9,4) NULL,
  packaging_mode    ENUM('fixed','percent') NOT NULL DEFAULT 'fixed',
  packaging_value   DECIMAL(18,6) NOT NULL DEFAULT 0,
  labor_mode        ENUM('fixed','percent') NOT NULL DEFAULT 'fixed',
  labor_value       DECIMAL(18,6) NOT NULL DEFAULT 0,
  overhead_mode     ENUM('fixed','percent') NOT NULL DEFAULT 'fixed',
  overhead_value    DECIMAL(18,6) NOT NULL DEFAULT 0,
  waste_pct         DECIMAL(9,6) NOT NULL DEFAULT 0,
  notes             VARCHAR(1000) NULL,
  cost_total        DECIMAL(18,6) NULL,
  cost_per_portion  DECIMAL(18,6) NULL,
  cost_complete     TINYINT(1) NOT NULL DEFAULT 0,
  costed_at         DATETIME(3) NULL,
  is_demo           TINYINT(1) NOT NULL DEFAULT 0,
  row_version       INT UNSIGNED NOT NULL DEFAULT 1,
  created_by        BIGINT UNSIGNED NULL,
  updated_by        BIGINT UNSIGNED NULL,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at        DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_uuid (uuid),
  UNIQUE KEY uq_products_tenant_id (tenant_id, id),
  UNIQUE KEY uq_products_tenant_name (tenant_id, name_active),
  KEY ix_products_tenant_updated (tenant_id, updated_at),
  KEY ix_products_tenant_name (tenant_id, name),
  KEY ix_products_tenant_category (tenant_id, category_id),
  KEY ix_products_created_by (created_by),
  KEY ix_products_updated_by (updated_by),
  CONSTRAINT fk_products_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_products_category FOREIGN KEY (tenant_id, category_id) REFERENCES product_categories (tenant_id, id),
  CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES users (id),
  CONSTRAINT ck_products_portions CHECK (portions > 0),
  CONSTRAINT ck_products_price CHECK (current_price IS NULL OR current_price >= 0),
  CONSTRAINT ck_products_margin CHECK (target_margin IS NULL OR (target_margin >= 0 AND target_margin < 1)),
  CONSTRAINT ck_products_multiplier CHECK (multiplier IS NULL OR multiplier > 0),
  CONSTRAINT ck_products_components CHECK (packaging_value >= 0 AND labor_value >= 0 AND overhead_value >= 0),
  CONSTRAINT ck_products_waste CHECK (waste_pct >= 0 AND waste_pct < 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE recipe_items (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  product_id     BIGINT UNSIGNED NOT NULL,
  ingredient_id  BIGINT UNSIGNED NOT NULL,
  quantity       DECIMAL(18,6) NOT NULL,
  unit_id        TINYINT UNSIGNED NOT NULL,
  position       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_recipe_items_tenant_product (tenant_id, product_id, position),
  KEY ix_recipe_items_tenant_ingredient (tenant_id, ingredient_id),
  KEY ix_recipe_items_unit (unit_id),
  CONSTRAINT fk_recipe_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_recipe_items_product FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_items_ingredient FOREIGN KEY (tenant_id, ingredient_id) REFERENCES ingredients (tenant_id, id),
  CONSTRAINT fk_recipe_items_unit FOREIGN KEY (unit_id) REFERENCES units (id),
  CONSTRAINT ck_recipe_items_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Costos fijos y escenarios (SOP §18)
-- ---------------------------------------------------------------------------
CREATE TABLE fixed_costs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid            CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id       BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(120) NOT NULL,
  name_active     VARCHAR(120) GENERATED ALWAYS AS (IF(deleted_at IS NULL, name, NULL)) VIRTUAL,
  monthly_amount  DECIMAL(18,6) NOT NULL,
  notes           VARCHAR(500) NULL,
  is_demo         TINYINT(1) NOT NULL DEFAULT 0,
  row_version     INT UNSIGNED NOT NULL DEFAULT 1,
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at      DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fixed_costs_uuid (uuid),
  UNIQUE KEY uq_fixed_costs_tenant_name (tenant_id, name_active),
  KEY ix_fixed_costs_tenant_updated (tenant_id, updated_at),
  KEY ix_fixed_costs_created_by (created_by),
  KEY ix_fixed_costs_updated_by (updated_by),
  CONSTRAINT fk_fixed_costs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_fixed_costs_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_fixed_costs_updated_by FOREIGN KEY (updated_by) REFERENCES users (id),
  CONSTRAINT ck_fixed_costs_amount CHECK (monthly_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE scenarios (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id           BIGINT UNSIGNED NOT NULL,
  name                VARCHAR(120) NOT NULL,
  product_id          BIGINT UNSIGNED NULL,
  price               DECIMAL(18,6) NOT NULL,
  units_per_day       DECIMAL(12,4) NOT NULL,
  days_per_month      TINYINT UNSIGNED NOT NULL,
  fixed_costs         DECIMAL(18,6) NULL, -- NULL = suma de costos fijos del negocio
  variable_unit_cost  DECIMAL(18,6) NOT NULL,
  variable_source     ENUM('product','manual') NOT NULL DEFAULT 'manual',
  notes               VARCHAR(500) NULL,
  is_demo             TINYINT(1) NOT NULL DEFAULT 0,
  row_version         INT UNSIGNED NOT NULL DEFAULT 1,
  created_by          BIGINT UNSIGNED NULL,
  updated_by          BIGINT UNSIGNED NULL,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at          DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_scenarios_uuid (uuid),
  KEY ix_scenarios_tenant_updated (tenant_id, updated_at),
  KEY ix_scenarios_tenant_product (tenant_id, product_id),
  KEY ix_scenarios_created_by (created_by),
  KEY ix_scenarios_updated_by (updated_by),
  CONSTRAINT fk_scenarios_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_scenarios_product FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id),
  CONSTRAINT fk_scenarios_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_scenarios_updated_by FOREIGN KEY (updated_by) REFERENCES users (id),
  CONSTRAINT ck_scenarios_values CHECK (price >= 0 AND units_per_day >= 0 AND variable_unit_cost >= 0 AND (fixed_costs IS NULL OR fixed_costs >= 0)),
  CONSTRAINT ck_scenarios_days CHECK (days_per_month BETWEEN 1 AND 31)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Exportaciones (registro; los archivos se generan bajo demanda y no se guardan)
-- ---------------------------------------------------------------------------
CREATE TABLE exports (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NULL,
  report      VARCHAR(40) NOT NULL,
  format      ENUM('pdf','csv','xlsx','json') NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_exports_tenant_created (tenant_id, created_at),
  KEY ix_exports_user (user_id),
  CONSTRAINT fk_exports_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_exports_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- IA (SOP §20–25)
-- ---------------------------------------------------------------------------
CREATE TABLE ai_conversations (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid        CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id   BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(160) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_conversations_uuid (uuid),
  UNIQUE KEY uq_ai_conversations_tenant_id (tenant_id, id),
  KEY ix_ai_conversations_tenant_user (tenant_id, user_id, updated_at),
  KEY ix_ai_conversations_user (user_id),
  CONSTRAINT fk_ai_conversations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_ai_conversations_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ai_messages (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id        BIGINT UNSIGNED NOT NULL,
  conversation_id  BIGINT UNSIGNED NOT NULL,
  role             ENUM('user','assistant') NOT NULL,
  content          JSON NOT NULL,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_ai_messages_tenant_conversation (tenant_id, conversation_id, id),
  CONSTRAINT fk_ai_messages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_ai_messages_conversation FOREIGN KEY (tenant_id, conversation_id) REFERENCES ai_conversations (tenant_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ai_tool_calls (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id        BIGINT UNSIGNED NOT NULL,
  conversation_id  BIGINT UNSIGNED NULL,
  user_id          BIGINT UNSIGNED NULL,
  tool             VARCHAR(60) NOT NULL,
  input_json       JSON NULL,
  output_json      JSON NULL,
  status           ENUM('ok','error','denied') NOT NULL,
  duration_ms      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_ai_tool_calls_tenant_created (tenant_id, created_at),
  KEY ix_ai_tool_calls_tenant_conversation (tenant_id, conversation_id),
  KEY ix_ai_tool_calls_user (user_id),
  CONSTRAINT fk_ai_tool_calls_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_ai_tool_calls_conversation FOREIGN KEY (tenant_id, conversation_id) REFERENCES ai_conversations (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_tool_calls_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ai_usage (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  user_id        BIGINT UNSIGNED NULL,
  feature        ENUM('chat','invoice','recipe','insight') NOT NULL,
  provider       VARCHAR(30) NOT NULL,
  model          VARCHAR(80) NOT NULL,
  input_tokens   INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens  INT UNSIGNED NOT NULL DEFAULT 0,
  cost_usd       DECIMAL(12,6) NOT NULL DEFAULT 0,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_ai_usage_tenant_created (tenant_id, created_at),
  KEY ix_ai_usage_created (created_at),
  KEY ix_ai_usage_user (user_id),
  CONSTRAINT fk_ai_usage_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_ai_usage_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Borradores propuestos por IA: propuesta → revisión → confirmación → ejecución (SOP §21)
CREATE TABLE ai_drafts (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid          CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant_id     BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  kind          ENUM('recipe','purchase','scenario') NOT NULL,
  payload       JSON NOT NULL,
  status        ENUM('pending','confirmed','discarded') NOT NULL DEFAULT 'pending',
  document_id   BIGINT UNSIGNED NULL,
  result_uuid   CHAR(36) NULL,
  expires_at    DATETIME(3) NOT NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  confirmed_at  DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_drafts_uuid (uuid),
  KEY ix_ai_drafts_tenant_status (tenant_id, status, created_at),
  KEY ix_ai_drafts_user (user_id),
  KEY ix_ai_drafts_document (tenant_id, document_id),
  CONSTRAINT fk_ai_drafts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_ai_drafts_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_ai_drafts_document FOREIGN KEY (tenant_id, document_id) REFERENCES uploaded_documents (tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Mensajes del formulario de contacto público
-- ---------------------------------------------------------------------------
CREATE TABLE contact_messages (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(190) NOT NULL,
  business    VARCHAR(120) NULL,
  message     VARCHAR(2000) NOT NULL,
  ip          VARCHAR(45) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_contact_messages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
