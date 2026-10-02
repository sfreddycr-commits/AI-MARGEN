FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/api/ ./apps/api/
RUN pnpm --filter @aimargen/api build

FROM node:22-alpine AS runner
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/assets ./apps/api/assets
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
