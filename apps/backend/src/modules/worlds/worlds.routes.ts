import type { FastifyInstance, FastifyRequest } from "fastify";
import type { PublicWorld, WorldDetail } from "@school-class/shared";
import { z } from "zod";
import { prisma } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";

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

/** Professor vê os mundos que criou; aluno vê os mundos em que está matriculado. */
function accessibleWorlds(request: FastifyRequest): Prisma.WorldWhereInput {
  const { sub, role } = request.user;
  return role === "TEACHER" ? { ownerId: sub } : { enrollments: { some: { userId: sub } } };
}

export async function worldRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/worlds", async (request): Promise<PublicWorld[]> => {
    return prisma.world.findMany({
      where: accessibleWorlds(request),
      select: worldSelect,
      orderBy: { createdAt: "asc" },
    });
  });

  // Mundo + NPCs. As tarefas NÃO vão aqui: o jogo as pede ao NPC, sem respostas.
  app.get("/worlds/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);

    const world = await prisma.world.findFirst({
      where: { id, ...accessibleWorlds(request) },
      select: { ...worldSelect, npcs: { select: npcSelect } },
    });
    // 404 também quando o mundo existe mas o usuário não tem acesso (não revela que existe).
    if (!world) return reply.code(404).send({ error: "Mundo não encontrado" });

    const body: WorldDetail = world;
    return body;
  });
}
