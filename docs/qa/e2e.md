# E2E y QA visual

- Herramienta: Playwright (`playwright.config.ts`, pruebas en `e2e/`).
- Proyectos: `mobile-390` (390×844, táctil) y `desktop-1440` (1440×900) — SOP §37.
- Corre contra el **build de producción** (`vite preview`) y la API real (`node dist/server.js`) con MySQL.

```bash
pnpm build
pnpm exec playwright install chromium   # una vez
pnpm test:e2e
```

## Entornos sin descarga de navegadores

Si `playwright install` no puede descargar Chromium (red restringida), se puede usar cualquier
Chromium compatible indicando:

```bash
CHROMIUM_PATH=/ruta/a/chromium \
CHROMIUM_ARGS="--no-sandbox --disable-setuid-sandbox --no-zygote --in-process-gpu --use-gl=angle --use-angle=swiftshader --disable-dev-shm-usage" \
pnpm test:e2e
```

En el entorno de desarrollo del agente se usó el binario del paquete npm `@sparticuz/chromium`.
