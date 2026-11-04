/**
 * Dados de exemplo: 1 professor, 3 alunos, 1 mundo, 1 NPC com 3 tarefas.
 *
 * Contas (usuário / senha) — SÓ PARA DESENVOLVIMENTO:
 *   professor / professor123
 *   aluno     / aluno123     (matriculado no Mundo Inicial)
 *   maria     / maria123     (matriculada no Mundo Inicial)
 *   joao      / joao123      (sem mundo — para testar o acesso)
 *
 * Dev:      pnpm --filter @school-class/backend db:seed
 * Produção: docker compose exec backend node dist/seed.js
 */
import { prisma } from "./db.js";
import { hashPassword } from "./modules/auth/password.js";

async function upsertUser(username: string, name: string, password: string, role: "STUDENT" | "TEACHER" = "STUDENT") {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, name, passwordHash, role },
  });
}

async function main() {
  const teacher = await upsertUser("professor", "Professor", "professor123", "TEACHER");
  const student = await upsertUser("aluno", "Aluno Exemplo", "aluno123");
  const maria = await upsertUser("maria", "Maria", "maria123");
  await upsertUser("joao", "João", "joao123");

  const existing = await prisma.world.findFirst({ where: { name: "Mundo Inicial" } });
  if (existing) {
    // Mundo já existe: só garante as matrículas.
    for (const userId of [student.id, maria.id]) {
      await prisma.enrollment.upsert({
        where: { userId_worldId: { userId, worldId: existing.id } },
        update: {},
        create: { userId, worldId: existing.id },
      });
    }
    console.log("Seed já aplicado (usuários e matrículas atualizados).");
    return;
  }

  await prisma.world.create({
    data: {
      name: "Mundo Inicial",
      description: "Um mundo de boas-vindas para conhecer o jogo.",
      mapKey: "starter",
      ownerId: teacher.id,
      enrollments: { create: [{ userId: student.id }, { userId: maria.id }] },
      npcs: {
        create: {
          name: "Sábia Ana",
          greeting: "Olá, aventureiro! Responda meus desafios para ganhar XP.",
          x: 10,
          y: 8,
          tasks: {
            create: [
              {
                type: "MULTIPLE_CHOICE",
                prompt: "Qual é a capital do Brasil?",
                options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
                answer: "Brasília",
                xpReward: 20,
                order: 1,
              },
              {
                type: "TRUE_FALSE",
                prompt: "A água ferve a 100 °C ao nível do mar.",
                answer: "true",
                xpReward: 10,
                order: 2,
              },
              {
                type: "FILL_BLANK",
                prompt: "7 x 8 = ___",
                answer: "56",
                xpReward: 15,
                order: 3,
              },
            ],
          },
        },
      },
    },
  });

  console.log("Seed aplicado com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
