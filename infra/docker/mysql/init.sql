-- Inicialización del contenedor local (solo desarrollo).
-- Crea la base de pruebas y da permisos al usuario de la aplicación.
CREATE DATABASE IF NOT EXISTS aimargen_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON aimargen_dev.* TO 'aimargen'@'%';
GRANT ALL PRIVILEGES ON aimargen_test.* TO 'aimargen'@'%';
-- Las pruebas recrean aimargen_test; se requiere CREATE/DROP a nivel de esa base.
FLUSH PRIVILEGES;
