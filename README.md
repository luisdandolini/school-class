# School Class

Jogo educacional 2D (top-down) onde alunos exploram mundos temáticos, conversam com NPCs, completam tarefas e ganham XP.

## Arquitetura

```
apps/
  backend/      API (Fastify) + futuro servidor de jogo (Colyseus) + Prisma
  game/         Jogo em Phaser 3            (próxima branch)
  admin/        Painel do professor (React) (futuro)
packages/
  shared/       Tipos e regras comuns (tarefas, mundos, cálculo de nível)
docker/         Configuração do Nginx
```

- **O servidor é a autoridade:** o jogo nunca recebe as respostas certas; o backend corrige e concede XP.
- **Conteúdo vem do banco:** mundos, NPCs e tarefas são cadastrados pelo professor.

## Pré-requisitos

- Node 22+ e pnpm 10+
- Docker Desktop

## Desenvolvimento

```bash
pnpm install
cp .env.example .env && cp .env.example apps/backend/.env

pnpm dev:db                                  # sobe o Postgres no Docker
pnpm --filter @school-class/shared build     # compila os tipos compartilhados
pnpm --filter @school-class/backend db:migrate
pnpm --filter @school-class/backend db:seed  # dados de exemplo
pnpm dev:backend                             # http://localhost:3000/api/health
```

Outros comandos úteis:

```bash
pnpm --filter @school-class/backend db:studio   # interface visual do banco
pnpm typecheck                                   # checa tipos de todo o monorepo
pnpm dev:db:down                                 # para o banco
```

## Produção

```bash
cp .env.example .env   # ajuste senhas e JWT_SECRET
docker compose up -d --build
```

Acesse `http://localhost` (jogo) e `http://localhost/api/health` (API). As migrations são aplicadas automaticamente ao subir o backend.

## Fluxo de branches

- `main` é sempre estável.
- Cada funcionalidade nasce numa branch `feat/<nome>` (ou `fix/<nome>`) a partir da `main`.
- A branch volta para a `main` via Pull Request.
