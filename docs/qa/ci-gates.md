# Gates de CI

Pipeline: `.github/workflows/ci.yml`. Cualquier gate en rojo bloquea merge y despliegue.

| #   | Gate                                                  | Comando                                            | Desde                     |
| --- | ----------------------------------------------------- | -------------------------------------------------- | ------------------------- |
| 1   | Install reproducible                                  | `pnpm install --frozen-lockfile`                   | Etapa 0                   |
| 2   | Formato                                               | `pnpm format:check`                                | Etapa 0                   |
| 3   | Lint (ESLint + Stylelint)                             | `pnpm lint`                                        | Etapa 0                   |
| 4   | Typecheck                                             | `pnpm typecheck`                                   | Etapa 0                   |
| 5   | Unit tests                                            | `pnpm test:unit`                                   | Etapa 0                   |
| 6   | Migraciones aplican en limpio + convención de nombres | `pnpm db:migrate` + `pnpm db:check`                | Etapa 0                   |
| 7   | Integration tests (MySQL real)                        | `pnpm test:integration`                            | Etapa 0 (crece por etapa) |
| 8   | Build                                                 | `pnpm build`                                       | Etapa 0                   |
| 9   | Dependency audit (high/critical)                      | `pnpm audit --audit-level high`                    | Etapa 0                   |
| 10  | Security scan (CodeQL)                                | workflow `codeql.yml`                              | Etapa 0                   |
| 11  | Pruebas cross-tenant                                  | `pnpm test:integration` (suite `tenant-isolation`) | Etapa 3                   |
| 12  | E2E + visual 390×844 / 1440×900                       | `pnpm test:e2e` (Playwright)                       | Etapa 1                   |
