# ADR-0002 — Backend con Fastify

- **Estado:** Aceptado — 2026-10-01
- **Contexto:** SOP §4 permite Fastify o NestJS. Se busca lo más económico y mantenible.
- **Decisión:** Fastify 5 + TypeScript, validación con Zod (`fastify-type-provider-zod`),
  OpenAPI generado desde los esquemas, logs estructurados con pino (incluido en Fastify).
- **Alternativa descartada:** NestJS — más ceremonia (decoradores, DI) sin beneficio claro para el tamaño del equipo.
- **Consecuencias:** estructura modular la definimos nosotros (ADR-0004).
