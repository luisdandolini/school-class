import type { FastifyInstance } from "fastify";
import type { PublicWorld, WorldDetail } from "@school-class/shared";
import { z } from "zod";
import { prisma } from "../../db.js";

const worldSelect = { id: true, name: true, description: true, mapKey: true } as const;
const npcSelect = {
  id: true,
  worldId: true,
  name: true,
  greeting: true,
  sprite: true,
  x: true,
  y: true,
} as const;

export async function worldRoutes(app: FastifyInstance) {
  // Lista os mundos disponíveis. (Depois da feat/auth: só os mundos do aluno logado.)
  app.get("/worlds", async (): Promise<PublicWorld[]> => {
    return prisma.world.findMany({ select: worldSelect, orderBy: { createdAt: "asc" } });
  });

  // Mundo + NPCs. As tarefas NÃO vão aqui: o jogo as pede ao NPC, sem respostas.
  app.get("/worlds/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);

    const world = await prisma.world.findUnique({
      where: { id },
      select: { ...worldSelect, npcs: { select: npcSelect } },
    });
    if (!world) return reply.code(404).send({ error: "Mundo não encontrado" });

    const { npcs, ...rest } = world;
    const body: WorldDetail = { ...rest, npcs };
    return body;
  });
}
