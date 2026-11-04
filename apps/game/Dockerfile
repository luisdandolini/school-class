# Build do jogo (Vite) servido pelo Nginx, que também faz proxy da API.
# Build a partir da raiz do monorepo: docker build -f apps/game/Dockerfile .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/game/package.json apps/game/
RUN pnpm install --frozen-lockfile --filter @school-class/game...
COPY packages/shared packages/shared
COPY apps/game apps/game
RUN pnpm --filter @school-class/shared build && pnpm --filter @school-class/game build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/game/dist /usr/share/nginx/html
