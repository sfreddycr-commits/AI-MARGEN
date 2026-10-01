FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile --filter @aimargen/api...

FROM deps AS builder
COPY apps/api/ ./apps/api/
RUN pnpm --filter @aimargen/api build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile --filter @aimargen/api... --prod
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/assets ./apps/api/assets
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
