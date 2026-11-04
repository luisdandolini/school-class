/**
 * Dados de exemplo: 1 professor, 3 alunos, 1 mundo e 2 NPCs com tarefas.
 * Pode rodar várias vezes: só cria o que ainda não existe.
 *
 * Contas (usuário / senha) — SÓ PARA DESENVOLVIMENTO:
 *   professor / professor123
 *   carla     / carla123     (outra professora, sem mundos — testa o isolamento)
 *   aluno     / aluno123     (matriculado no Mundo Inicial)
 *   maria     / maria123     (matriculada no Mundo Inicial)
 *   joao      / joao123      (sem mundo — para testar o acesso)
 *
 * Dev:      pnpm --filter @school-class/backend db:seed
 * Produção: docker compose exec backend node dist/seed.js
 */
import { prisma } from "./db.js";
import type { TaskType } from "./generated/prisma/client.js";
import { hashPassword } from "./modules/auth/password.js";

async function upsertUser(
  username: string,
  name: string,
  password: string,
  role: "STUDENT" | "TEACHER" = "STUDENT",
  createdById?: string,
) {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { username },
    update: { passwordHash, createdById },
    create: { username, name, passwordHash, role, createdById },
  });
}

interface SeedTask {
  type: TaskType;
  prompt: string;
  options?: string[];
  answer?: string;
  xpReward: number;
}

interface SeedNpc {
  name: string;
  greeting: string;
  sprite: string;
  x: number;
  y: number;
  tasks: SeedTask[];
}

const NPCS: SeedNpc[] = [
  {
    name: "Sábia Ana",
    greeting: "Olá, aventureiro! Responda meus desafios para ganhar XP.",
    sprite: "npc",
    x: 10,
    y: 8,
    tasks: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Qual é a capital do Brasil?",
        options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
        answer: "Brasília",
        xpReward: 20,
      },
      { type: "TRUE_FALSE", prompt: "A água ferve a 100 °C ao nível do mar.", answer: "true", xpReward: 10 },
      { type: "FILL_BLANK", prompt: "7 x 8 = ___", answer: "56|cinquenta e seis", xpReward: 15 },
      {
        type: "OPEN",
        prompt: "Em uma frase: por que é importante cuidar da natureza?",
        xpReward: 25,
      },
    ],
  },
  {
    name: "Mestre Leo",
    greeting: "Bem-vindo à minha casa! Gosto de números. Vamos treinar?",
    sprite: "npc-mestre",
    x: 23,
    y: 8,
    tasks: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Quanto é 15 + 27?",
        options: ["32", "42", "52", "41"],
        answer: "42",
        xpReward: 15,
      },
      { type: "TRUE_FALSE", prompt: "Todo número par é divisível por 2.", answer: "true", xpReward: 10 },
      { type: "FILL_BLANK", prompt: "A metade de 50 é ___", answer: "25|vinte e cinco", xpReward: 15 },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Qual destes é um número primo?",
        options: ["9", "15", "17", "21"],
        answer: "17",
        xpReward: 30,
      },
    ],
  },
];

async function main() {
  const teacher = await upsertUser("professor", "Professor", "professor123", "TEACHER");
  await upsertUser("carla", "Professora Carla", "carla123", "TEACHER");
  const student = await upsertUser("aluno", "Aluno Exemplo", "aluno123", "STUDENT", teacher.id);
  const maria = await upsertUser("maria", "Maria", "maria123", "STUDENT", teacher.id);
  await upsertUser("joao", "João", "joao123", "STUDENT", teacher.id);

  const world =
    (await prisma.world.findFirst({ where: { name: "Mundo Inicial" } })) ??
    (await prisma.world.create({
      data: {
        name: "Mundo Inicial",
        description: "Um mundo de boas-vindas para conhecer o jogo.",
        mapKey: "starter",
        ownerId: teacher.id,
      },
    }));

  for (const userId of [student.id, maria.id]) {
    await prisma.enrollment.upsert({
      where: { userId_worldId: { userId, worldId: world.id } },
      update: {},
      create: { userId, worldId: world.id },
    });
  }

  for (const n of NPCS) {
    const { tasks, ...npcData } = n;
    const npc =
      (await prisma.npc.findFirst({ where: { worldId: world.id, name: n.name } })) ??
      (await prisma.npc.create({ data: { ...npcData, worldId: world.id } }));
    // Mantém posição/fala/sprite atualizados com o seed.
    await prisma.npc.update({ where: { id: npc.id }, data: npcData });

    for (const [i, t] of tasks.entries()) {
      const order = i + 1;
      const data = {
        type: t.type,
        prompt: t.prompt,
        options: t.options ?? [],
        answer: t.answer ?? null,
        xpReward: t.xpReward,
      };
      const existing = await prisma.task.findFirst({ where: { npcId: npc.id, order } });
      if (existing) await prisma.task.update({ where: { id: existing.id }, data });
      else await prisma.task.create({ data: { ...data, npcId: npc.id, order } });
    }
  }

  console.log("Seed aplicado com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
