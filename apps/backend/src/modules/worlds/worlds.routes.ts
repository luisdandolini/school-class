import type { FastifyInstance } from "fastify";
import type { PublicWorld, WorldDetail } from "@school-class/shared";
import { z } from "zod";
import { prisma } from "../../db.js";
import { progressByNpc } from "../tasks/tasks.service.js";
import { accessibleWorlds } from "./access.js";

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
  app.addHook("preHandler", app.authenticate);

  app.get("/worlds", async (request): Promise<PublicWorld[]> => {
    return prisma.world.findMany({
      where: accessibleWorlds(request.user),
      select: worldSelect,
      orderBy: { createdAt: "asc" },
    });
  });

  // Mundo + NPCs + progresso do aluno em cada NPC. As tarefas NÃO vão aqui.
  app.get("/worlds/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);

    const world = await prisma.world.findFirst({
      where: { id, ...accessibleWorlds(request.user) },
      select: { ...worldSelect, npcs: { select: npcSelect } },
    });
    // 404 também quando o mundo existe mas o usuário não tem acesso (não revela que existe).
    if (!world) return reply.code(404).send({ error: "Mundo não encontrado" });

    const progress = await progressByNpc(request.user.sub, world.id);
    const body: WorldDetail = {
      ...world,
      npcs: world.npcs.map((npc) => ({
        ...npc,
        progress: progress.get(npc.id) ?? { total: 0, completed: 0, pendingReview: 0 },
      })),
    };
    return body;
  });
}
