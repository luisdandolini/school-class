# School Class

Jogo educacional 2D (top-down) onde alunos exploram mundos temáticos, conversam com NPCs, completam tarefas e ganham XP.

## Arquitetura

```
apps/
  backend/      API (Fastify) + tempo real (WebSocket) + Prisma
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
| `aluno` | `aluno123` | Aluno, no Mundo Inicial (monta o personagem ao entrar) |
| `maria` | `maria123` | Aluna, no Mundo Inicial (já com personagem) |
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

## Personagem do aluno

Na primeira vez que entra no jogo, o aluno monta o personagem: **penteado** (curto, comprido, volumoso, raspado), **cor do cabelo**, **tom de pele** e **cor da roupa** (ou 🎲 sorteia). Depois, pode trocar a qualquer momento pelo botão **🎨 Visual**; os colegas online veem a mudança na hora. O painel mostra a miniatura de cada aluno (apagada para quem ainda não montou).

- Só existem opções fixas (índices de paletas), validadas no servidor: `PUT /api/auth/me/avatar`.
- Paletas e penteados ficam em `packages/shared/src/avatar.ts`.
- A arte `avatar-base.png` tem, para cada penteado, uma camada base e máscaras de cabelo, pele e roupa, que são pintadas com as cores escolhidas (sem ler pixels do canvas, o que funciona também em navegadores com proteção contra fingerprinting, como o Brave).

## Conquistas (medalhas)

O aluno ganha medalhas pelo que faz no jogo, com uma comemoração na tela; os colegas online recebem um aviso ("🏅 Maria ganhou a medalha “Em chamas”!"). O botão **🏅 Medalhas** mostra as conquistadas e as que faltam (com a dica de como ganhar).

| Medalha | Como ganhar |
|---|---|
| 👣 Primeiro passo | Concluir a primeira tarefa |
| 💪 Volta por cima | Acertar uma tarefa depois de ter errado |
| 🔥 Em chamas | 5 acertos seguidos, sem errar no meio |
| 📚 Dedicação / 🚀 Incansável | 10 / 25 tarefas concluídas |
| 💡 Ideia aprovada | Ter uma resposta livre aprovada na correção |
| ⭐ Nível 5 / 🌟 Nível 10 | Chegar ao nível |
| 🏆 Mundo concluído | Concluir todas as tarefas de um mundo (uma por mundo) |
| 👋 Simpatia | Mandar um emote para os colegas |

- As regras ficam no servidor (`apps/backend/src/modules/achievements`); a lista, em `packages/shared/src/achievements.ts`.
- Cada medalha é ganha uma única vez. Medalhas ganhas fora do jogo (ex.: resposta livre aprovada depois) são comemoradas no próximo login.
- Ao entrar, o jogo também concede as medalhas que o histórico do aluno já garante (útil para quem tinha progresso antes das medalhas existirem).
- No relatório do mundo, o professor vê quantas medalhas cada aluno tem e, ao clicar no aluno, quais são.

## Multiplayer

Alunos no mesmo mundo se veem em tempo real:

- Nome e nível sobre cada colega; movimento suavizado (interpolação).
- **Emotes e frases prontas** (teclas 1–6 ou botão "😀 Emotes"): 👋 Oi!, 🤝 Vamos juntos?, 🎉 Parabéns!, 🙋 Preciso de ajuda!, 😄 Que legal!, 🤔 Hmm... — **sem chat livre**, por segurança.
- Quando alguém sobe de nível, os colegas online recebem um aviso.
- Contador "👥 N pessoas no mundo"; o painel mostra quem está jogando agora em cada mundo.
- Mesmo aluno em outra aba: a conexão antiga é encerrada.

Implementado com WebSocket no próprio backend (`GET /api/realtime?worldId=...`, autenticado pelo cookie de sessão). O servidor valida tudo o que recebe (formato, limites do mapa, frequência de mensagens e emotes) e reconecta automaticamente se a conexão cair. Os jogadores ficam em memória: para mais de um processo do backend seria preciso um Redis (não necessário para uma escola).

## Painel do professor

Em `/admin` (só contas de professor):

- **Alunos:** cadastrar um a um ou a **turma inteira** colando a lista de nomes; usuários (`ana.souza`) e senhas fáceis de digitar (`gatonuvem47`) são gerados automaticamente. Editar, gerar nova senha e excluir.
- **Cartões de acesso:** após cadastrar ou gerar nova senha, dá para copiar ou **imprimir cartões** com usuário e senha para recortar e entregar. As senhas só aparecem nesse momento.
- **Mundos:** quem está **jogando agora**; criar, editar e excluir mundos; matricular e remover alunos; botão **Testar no jogo**.
- **NPCs:** nome, fala de boas-vindas, aparência e **posição escolhida clicando no mapa** (o painel bloqueia árvores, água, casa, o ponto de partida e lugares já ocupados).
- **Tarefas:** criar e editar os 4 tipos com **pré-visualização** de como o aluno vê; reordenar; XP por tarefa; estatísticas (quantos concluíram, respostas, aguardando correção). Editar ou excluir tarefas já respondidas mostra um aviso — o XP já ganho pelos alunos nunca é retirado.
- **Correções:** fila de respostas livres (com contador no menu). Marque como **correta** (o aluno ganha o XP) ou **precisa melhorar**, com um comentário opcional que o aluno vê no jogo — a NPC avisa e a janela do desafio mostra o comentário para ele refazer.
- **Relatório** (aba em cada mundo): conclusão média, progresso de cada aluno (clique para ver o que ele respondeu em cada tarefa) e as **tarefas mais difíceis**, ordenadas pela taxa de erro.
- Cada professor só vê os alunos que cadastrou ou que estão nos mundos dele; só quem cadastrou pode excluir.

Rotas de conteúdo: `/api/admin/worlds` (POST), `/api/admin/worlds/:id` (GET, PATCH, DELETE), `/api/admin/worlds/:id/npcs` (POST), `/api/admin/npcs/:id` (PATCH, DELETE), `/api/admin/npcs/:id/tasks` (GET, POST), `/api/admin/npcs/:id/tasks/order` (PUT), `/api/admin/tasks/:id` (PUT, DELETE).

Rotas de correção e relatório: `/api/admin/reviews` (GET), `/api/admin/reviews/count`, `/api/admin/reviews/:id` (POST), `/api/admin/worlds/:id/report`, `/api/admin/worlds/:id/students/:studentId/progress`.

Rotas de alunos: `/api/admin/students` (GET, POST), `/api/admin/students/bulk`, `/api/admin/students/:id` (PATCH, DELETE), `/api/admin/students/:id/reset-password`, `/api/admin/worlds`, `/api/admin/worlds/:id/students` (POST, DELETE).

## Tarefas e XP

Ao conversar com um NPC, o aluno recebe os desafios dele, um por vez:

| Tipo | Como o aluno responde | Correção |
|---|---|---|
| `MULTIPLE_CHOICE` | escolhe uma alternativa (teclas 1–4) | automática |
| `TRUE_FALSE` | Verdadeiro ou Falso | automática (`answer` = `true`/`false`) |
| `FILL_BLANK` | digita a resposta | automática; várias respostas aceitas com `\|` (ex.: `56\|cinquenta e seis`) |
| `OPEN` | escreve um texto livre | pelo professor, na página **Correções** do painel |

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
pnpm --filter @school-class/game assets       # gera tiles.png, avatar-base.png, npc.png...
pnpm --filter @school-class/game maps         # gera todos os mapas (sobrescreve!)
pnpm --filter @school-class/game maps praia   # gera só um mapa
```

- Cenários disponíveis: **Vila Inicial**, **Escola** (sala de aula, biblioteca e corredor), **Floresta** (trilha, rio e clareiras) e **Praia** (casinha, coqueiros, mar e píer). O professor escolhe o cenário ao criar ou editar um mundo, vendo uma prévia de cada um.
- Ao trocar o cenário de um mundo que já tem NPCs, eles mantêm a posição; se algum ficar em cima de um obstáculo, o painel avisa e mostra um contorno vermelho no mapa.
- Cada mapa é gerado por um script em `apps/game/scripts/maps/<nome>.mjs` (as ferramentas comuns ficam em `lib.mjs`).
- Os mapas ficam em `apps/game/public/assets/maps/` no formato do **[Tiled](https://www.mapeditor.org)** e podem ser abertos e editados nele.
  Camadas: `Chao`, `Objetos` (colide), `Topo` (desenhada por cima do jogador) e `Pontos` (objeto `spawn`).
- Tiles com a propriedade `collides = true` bloqueiam a passagem.
- Para trocar a arte, basta substituir os PNGs mantendo o layout (tiles 16x16; personagens com 3 quadros x 4 direções: baixo, esquerda, direita, cima).
- Cada mundo no banco tem um `mapKey`, que é o nome do arquivo do mapa. **Para um mapa novo aparecer no painel**, registre-o em `packages/shared/src/content.ts` (`MAPS`, com nome, descrição, largura e altura) e, se for gerado por script, em `scripts/generate-maps.mjs`.
- Aparências de NPC disponíveis ficam em `NPC_SPRITES` (mesmo arquivo).
- Para um penteado novo: desenhe-o em `HAIR_STYLES` no gerador de arte e acrescente o nome em `HAIR_STYLES` de `packages/shared/src/avatar.ts` (mesma ordem).

## Fluxo de branches

- `main` é sempre estável.
- Cada funcionalidade nasce numa branch `feat/<nome>` (ou `fix/<nome>`) a partir da `main`.
- A branch volta para a `main` via Pull Request.
