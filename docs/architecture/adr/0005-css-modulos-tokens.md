# ADR-0005 — CSS por módulo con design tokens (sin Tailwind)

- **Estado:** Aceptado — 2026-10-01 (confirmado por el propietario)
- **Contexto:** SOP §4 sugería Tailwind; el propietario requiere CSS por módulo.
- **Decisión:** CSS Modules por módulo + `apps/web/src/core/css/tokens.css` con variables CSS
  (colores, espaciado, radios, sombras, tipografía, z-index, safe areas).
  Los módulos solo consumen tokens; no se permiten colores literales fuera de `tokens.css`.
- **Consecuencias:** estilos aislados por módulo, sin dependencia de framework CSS.
  Stylelint verifica la convención.
