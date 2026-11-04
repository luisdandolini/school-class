/**
 * Dados de exemplo: 1 professor, 1 aluno, 1 mundo, 1 NPC com 3 tarefas.
 * Senhas provisórias — o hash de verdade entra na branch de autenticação.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const teacher = await prisma.user.upsert({
    where: { username: "professor" },
    update: {},
    create: { name: "Professor", username: "professor", passwordHash: "TODO", role: "TEACHER" },
  });

  const student = await prisma.user.upsert({
    where: { username: "aluno" },
    update: {},
    create: { name: "Aluno Exemplo", username: "aluno", passwordHash: "TODO" },
  });

  const existing = await prisma.world.findFirst({ where: { name: "Mundo Inicial" } });
  if (existing) {
    console.log("Seed já aplicado.");
    return;
  }

  await prisma.world.create({
    data: {
      name: "Mundo Inicial",
      description: "Um mundo de boas-vindas para conhecer o jogo.",
      mapKey: "starter",
      ownerId: teacher.id,
      enrollments: { create: { userId: student.id } },
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
