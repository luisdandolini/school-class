# School Class

Jogo educacional 2D (top-down) onde alunos exploram mundos temáticos, conversam com NPCs, completam tarefas e ganham XP.

## Arquitetura

```
apps/
  backend/      API (Fastify) + futuro servidor de jogo (Colyseus) + Prisma
  game/         Jogo em Phaser 3 (Vite + TypeScript)
  admin/        Painel do professor (React + Vite), servido em /admin
packages/
  shared/       Tipos e regras comuns (tarefas, mundos, cálculo de nível)
docker/         Nginx e Dockerfile web (jogo + painel)
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
pnpm dev                                     # backend + jogo juntos
```

- **Jogo:** http://localhost:5173 — setas/WASD para andar, Espaço (ou E) para conversar.
- **Painel do professor:** http://localhost:5174/admin — entre com uma conta de professor.

### Contas de teste (criadas pelo seed — só para desenvolvimento)

| Usuário | Senha | Papel |
|---|---|---|
| `aluno` | `aluno123` | Aluno, no Mundo Inicial |
| `maria` | `maria123` | Aluna, no Mundo Inicial |
| `joao` | `joao123` | Aluno sem mundo (testa o acesso) |
| `professor` | `professor123` | Professor, dono do Mundo Inicial |
| `carla` | `carla123` | Outra professora, sem mundos (testa o isolamento) |

Também dá para rodar separado: `pnpm dev:backend` (porta 3000), `pnpm dev:game` (porta 5173) e `pnpm dev:admin` (porta 5174). Jogo e painel fazem proxy de `/api` para o backend.

Outros comandos úteis:

```bash
pnpm --filter @school-class/backend db:studio   # interface visual do banco
pnpm typecheck                                   # checa tipos de todo o monorepo
pnpm dev:db:down                                 # para o banco
```

## Painel do professor

Em `/admin` (só contas de professor):

- **Alunos:** cadastrar um a um ou a **turma inteira** colando a lista de nomes; usuários (`ana.souza`) e senhas fáceis de digitar (`gatonuvem47`) são gerados automaticamente. Editar, gerar nova senha e excluir.
- **Cartões de acesso:** após cadastrar ou gerar nova senha, dá para copiar ou **imprimir cartões** com usuário e senha para recortar e entregar. As senhas só aparecem nesse momento.
- **Mundos:** ver os mundos, matricular e remover alunos.
- Cada professor só vê os alunos que cadastrou ou que estão nos mundos dele; só quem cadastrou pode excluir.

Rotas: `/api/admin/students` (GET, POST), `/api/admin/students/bulk`, `/api/admin/students/:id` (PATCH, DELETE), `/api/admin/students/:id/reset-password`, `/api/admin/worlds`, `/api/admin/worlds/:id/students` (POST, DELETE).

## Tarefas e XP

Ao conversar com um NPC, o aluno recebe os desafios dele, um por vez:

| Tipo | Como o aluno responde | Correção |
|---|---|---|
| `MULTIPLE_CHOICE` | escolhe uma alternativa (teclas 1–4) | automática |
| `TRUE_FALSE` | Verdadeiro ou Falso | automática (`answer` = `true`/`false`) |
| `FILL_BLANK` | digita a resposta | automática; várias respostas aceitas com `\|` (ex.: `56\|cinquenta e seis`) |
| `OPEN` | escreve um texto livre | pelo professor (painel, em breve) |

- A correção ignora maiúsculas, acentos, espaços extras e pontuação final.
- **O jogo nunca recebe a resposta certa** — o backend corrige.
- Cada tarefa dá XP **uma única vez** (garantido pelo banco, mesmo com envios simultâneos).
- Respostas erradas ficam registradas (para relatórios do professor) e o aluno pode tentar de novo.
- Marcadores sobre os NPCs: **!** desafio disponível · **…** aguardando o professor · **✓** tudo concluído.

Rotas: `GET /api/npcs/:id/tasks` e `POST /api/tasks/:id/submit`.

## Testes

```bash
pnpm test        # testes automatizados (Vitest): correção, geração de usuários e senhas
pnpm typecheck
```

## Autenticação

- Contas são criadas pelo professor (usuário + senha, sem e-mail).
- Senhas guardadas com **bcrypt**; a sessão é um JWT num cookie **httpOnly** (o JavaScript da página não consegue lê-lo), válido por 7 dias.
- Login limitado a **10 tentativas por minuto** por IP.
- Aluno só vê os mundos em que está matriculado; professor vê os mundos que criou.

Rotas: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

## Produção

```bash
cp .env.example .env   # ajuste senhas, JWT_SECRET (16+ caracteres) e COOKIE_SECURE
docker compose up -d --build
```

Acesse `http://localhost` (jogo), `http://localhost/admin` (painel) e `http://localhost/api/health` (API). As migrations são aplicadas automaticamente ao subir o backend.

> Com HTTPS (recomendado em produção), defina `COOKIE_SECURE=true` para o cookie de sessão só trafegar por conexão segura.

Para carregar os dados de exemplo em produção:

```bash
docker compose exec backend node dist/seed.js
```

## Arte e mapas

A arte é provisória e gerada por código (sem licenças de terceiros):

```bash
pnpm --filter @school-class/game assets       # gera tiles.png, player.png, npc.png
pnpm --filter @school-class/game map:starter  # gera o mapa inicial (sobrescreve!)
```

- Os mapas ficam em `apps/game/public/assets/maps/` no formato do **[Tiled](https://www.mapeditor.org)** e podem ser abertos e editados nele.
  Camadas: `Chao`, `Objetos` (colide), `Topo` (desenhada por cima do jogador) e `Pontos` (objeto `spawn`).
- Tiles com a propriedade `collides = true` bloqueiam a passagem.
- Para trocar a arte, basta substituir os PNGs mantendo o layout (tiles 16x16; personagens com 3 quadros x 4 direções: baixo, esquerda, direita, cima).
- Cada mundo no banco tem um `mapKey`, que é o nome do arquivo do mapa.

## Fluxo de branches

- `main` é sempre estável.
- Cada funcionalidade nasce numa branch `feat/<nome>` (ou `fix/<nome>`) a partir da `main`.
- A branch volta para a `main` via Pull Request.
