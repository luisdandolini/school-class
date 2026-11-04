# Nginx com o jogo (em /) e o painel do professor (em /admin), e proxy da API.
# Build a partir da raiz do monorepo: docker build -f docker/web.Dockerfile .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/game/package.json apps/game/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile --filter @school-class/game... --filter @school-class/admin...
COPY packages/shared packages/shared
COPY apps/game apps/game
COPY apps/admin apps/admin
RUN pnpm --filter @school-class/shared build \
 && pnpm --filter @school-class/game build \
 && pnpm --filter @school-class/admin build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/game/dist /usr/share/nginx/html
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html/admin
