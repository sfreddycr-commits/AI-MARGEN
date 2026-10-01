-- V0003 — Datos de referencia: planes, roles, permisos, matriz rol-permiso y feature flags.
-- La matriz está documentada en docs/security/roles-permisos.md

INSERT INTO plans (code, name, limits) VALUES
  ('inicial', 'Inicial', NULL);

INSERT INTO roles (code, name, is_global, rank_level) VALUES
  ('super_admin',  'Administrador de plataforma', 1, 100),
  ('tenant_owner', 'Propietario',                 0, 50),
  ('tenant_admin', 'Administrador',               0, 40),
  ('manager',      'Gerente',                     0, 30),
  ('operator',     'Operador',                    0, 20),
  ('viewer',       'Solo lectura',                0, 10);

INSERT INTO permissions (code, description) VALUES
  ('tenant.read',          'Ver datos del negocio'),
  ('tenant.update',        'Editar datos del negocio'),
  ('settings.read',        'Ver configuración'),
  ('settings.update',      'Editar configuración'),
  ('users.read',           'Ver usuarios del negocio'),
  ('users.manage',         'Invitar, editar y bloquear usuarios'),
  ('ingredients.read',     'Ver ingredientes'),
  ('ingredients.write',    'Crear, editar y archivar ingredientes'),
  ('suppliers.read',       'Ver proveedores'),
  ('suppliers.write',      'Crear, editar y archivar proveedores'),
  ('purchases.read',       'Ver compras'),
  ('purchases.write',      'Registrar compras'),
  ('products.read',        'Ver productos y recetas'),
  ('products.write',       'Crear, editar, duplicar y archivar productos y recetas'),
  ('pricing.read',         'Ver precios y márgenes'),
  ('pricing.write',        'Cambiar precios y márgenes objetivo'),
  ('scenarios.read',       'Ver escenarios'),
  ('scenarios.write',      'Crear y editar escenarios'),
  ('reports.read',         'Ver reportes'),
  ('reports.export',       'Exportar reportes y respaldos'),
  ('ai.use',               'Usar el asistente AImargen AI'),
  ('ai.confirm_actions',   'Confirmar acciones propuestas por la IA'),
  ('audit.read',           'Ver auditoría del negocio'),
  ('platform.admin',       'Administrar la plataforma (solo super_admin)');

-- super_admin: solo plataforma
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'platform.admin'
WHERE r.code = 'super_admin';

-- tenant_owner y tenant_admin: todos los permisos del negocio
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code <> 'platform.admin'
WHERE r.code IN ('tenant_owner', 'tenant_admin');

-- manager: operación completa sin usuarios, configuración, datos del negocio ni auditoría
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'tenant.read', 'settings.read', 'users.read',
  'ingredients.read', 'ingredients.write', 'suppliers.read', 'suppliers.write',
  'purchases.read', 'purchases.write', 'products.read', 'products.write',
  'pricing.read', 'pricing.write', 'scenarios.read', 'scenarios.write',
  'reports.read', 'reports.export', 'ai.use', 'ai.confirm_actions')
WHERE r.code = 'manager';

-- operator: registra lo que compra y mantiene insumos; no cambia precios ni recetas
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'tenant.read', 'settings.read',
  'ingredients.read', 'ingredients.write', 'suppliers.read', 'suppliers.write',
  'purchases.read', 'purchases.write', 'products.read', 'pricing.read',
  'scenarios.read', 'reports.read', 'ai.use', 'ai.confirm_actions')
WHERE r.code = 'operator';

-- viewer: solo lectura
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'tenant.read', 'settings.read', 'ingredients.read', 'suppliers.read', 'purchases.read',
  'products.read', 'pricing.read', 'scenarios.read', 'reports.read', 'ai.use')
WHERE r.code = 'viewer';

INSERT INTO feature_flags (code, description, default_enabled) VALUES
  ('ai.chat',            'Asistente conversacional AImargen AI',  1),
  ('ai.invoice_capture', 'Captura inteligente de facturas',        1),
  ('ai.recipe_draft',    'Creación de recetas por lenguaje natural', 1),
  ('ai.insights',        'Insights automáticos en el dashboard',   1),
  ('reports.xlsx',       'Exportación de reportes a Excel',        1);
