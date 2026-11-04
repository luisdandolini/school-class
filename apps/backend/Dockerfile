# Build a partir da raiz do monorepo: docker build -f apps/backend/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/backend apps/backend
# prisma generate exige a variável, mas não conecta no banco durante o build.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm --filter @school-class/shared build \
 && pnpm --filter @school-class/backend build \
 && pnpm deploy --filter @school-class/backend --prod --legacy /out \
 && cp -r apps/backend/dist apps/backend/prisma apps/backend/prisma.config.ts /out/

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /out /app
EXPOSE 3000
# Aplica migrations pendentes e inicia o servidor.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
