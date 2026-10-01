# ADR-0010 — Gateway de IA con abstracción de proveedor

- **Estado:** Aceptado — 2026-10-01 (detalle se completa en Etapa 11)
- **Decisión:**
  - Interfaz `AiProvider` (chat con tool calling, visión). Proveedor inicial: Anthropic Claude.
  - El LLM solo invoca herramientas registradas en el gateway; cada herramienta llama a un
    controlador existente, que a su vez usa SPs y el motor de cálculo.
  - El `tenant_id` lo inyecta el gateway desde la sesión; nunca es un argumento del modelo.
  - Herramientas de escritura producen borradores; ejecución solo tras confirmación explícita del usuario.
  - Todo tool call se registra en `ai_tool_calls` y el consumo en `ai_usage`.
