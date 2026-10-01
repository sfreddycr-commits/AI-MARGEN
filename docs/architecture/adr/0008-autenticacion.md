# ADR-0008 — Autenticación y sesión

- **Estado:** Aceptado — 2026-10-01
- **Decisión:**
  - Contraseñas con Argon2id (`@node-rs/argon2`, memoria 19 MiB, t=2).
  - Access token JWT de 15 min en cookie `HttpOnly; Secure; SameSite=Lax`.
  - Refresh token opaco (aleatorio 256 bits) de 30 días (7 sin "recordarme"), guardado **hasheado**
    en `user_sessions`, rotativo con detección de reutilización (revoca la familia).
  - CSRF: cookies `SameSite=Lax`, header personalizado obligatorio (`X-Requested-With`) en
    mutaciones y verificación de `Origin`.
  - Un usuario pertenece a un solo tenant en v1; `super_admin` sin tenant.
