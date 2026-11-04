import type { FastifyInstance } from "fastify";
import { LIMITS, MAP_KEYS, NPC_SPRITE_KEYS, type MapKey, type NpcSprite } from "@school-class/shared";
import { z } from "zod";
import {
  createNpc,
  createTask,
  createWorld,
  deleteNpc,
  deleteTask,
  deleteWorld,
  getWorldDetail,
  listNpcTasksAdmin,
  reorderTasks,
  updateNpc,
  updateTask,
  updateWorld,
} from "./content.service.js";
import { taskInputSchema } from "./task-input.js";

const id = z.string().min(1);
const text = (max: number, empty: string) => z.string().trim().min(1, empty).max(max, "Texto muito longo");

const worldFields = {
  name: text(LIMITS.worldName, "Dê um nome ao mundo"),
  description: z.string().trim().max(LIMITS.worldDescription, "Descrição muito longa"),
  mapKey: z.enum(MAP_KEYS as [MapKey, ...MapKey[]], { message: "Escolha um mapa" }),
};
const worldInput = z.object({ ...worldFields, description: worldFields.description.default("") });
/** Na edição, campo ausente = não mudar (sem valores padrão!). */
const worldPatch = z.object(worldFields).partial();

const tile = z.coerce.number().int("Posição inválida").min(0, "Posição inválida");
const npcInput = z.object({
  name: text(LIMITS.npcName, "Dê um nome ao NPC"),
  greeting: text(LIMITS.npcGreeting, "Escreva a fala de boas-vindas"),
  sprite: z.enum(NPC_SPRITE_KEYS as [NpcSprite, ...NpcSprite[]], { message: "Escolha uma aparência" }),
  x: tile,
  y: tile,
});

/** Conteúdo do jogo: mundos, NPCs e tarefas. (Herdam a exigência de professor de adminRoutes.) */
export async function contentRoutes(app: FastifyInstance) {
  // ---------- mundos ----------
  app.post("/admin/worlds", async (request, reply) => {
    const body = worldInput.parse(request.body);
    reply.code(201);
    return createWorld(request.user.sub, body);
  });

  app.get("/admin/worlds/:worldId", async (request) => {
    const { worldId } = z.object({ worldId: id }).parse(request.params);
    return getWorldDetail(request.user.sub, worldId);
  });

  app.patch("/admin/worlds/:worldId", async (request) => {
    const { worldId } = z.object({ worldId: id }).parse(request.params);
    const body = worldPatch.parse(request.body);
    return updateWorld(request.user.sub, worldId, body);
  });

  app.delete("/admin/worlds/:worldId", async (request, reply) => {
    const { worldId } = z.object({ worldId: id }).parse(request.params);
    await deleteWorld(request.user.sub, worldId);
    return reply.code(204).send();
  });

  // ---------- NPCs ----------
  app.post("/admin/worlds/:worldId/npcs", async (request, reply) => {
    const { worldId } = z.object({ worldId: id }).parse(request.params);
    const body = npcInput.parse(request.body);
    reply.code(201);
    return createNpc(request.user.sub, worldId, body);
  });

  app.patch("/admin/npcs/:npcId", async (request, reply) => {
    const { npcId } = z.object({ npcId: id }).parse(request.params);
    const body = npcInput.partial().parse(request.body);
    await updateNpc(request.user.sub, npcId, body);
    return reply.code(204).send();
  });

  app.delete("/admin/npcs/:npcId", async (request, reply) => {
    const { npcId } = z.object({ npcId: id }).parse(request.params);
    await deleteNpc(request.user.sub, npcId);
    return reply.code(204).send();
  });

  // ---------- tarefas ----------
  app.get("/admin/npcs/:npcId/tasks", async (request) => {
    const { npcId } = z.object({ npcId: id }).parse(request.params);
    return listNpcTasksAdmin(request.user.sub, npcId);
  });

  app.post("/admin/npcs/:npcId/tasks", async (request, reply) => {
    const { npcId } = z.object({ npcId: id }).parse(request.params);
    reply.code(201);
    return createTask(request.user.sub, npcId, taskInputSchema.parse(request.body));
  });

  app.put("/admin/npcs/:npcId/tasks/order", async (request, reply) => {
    const { npcId } = z.object({ npcId: id }).parse(request.params);
    const { taskIds } = z.object({ taskIds: z.array(id).max(200) }).parse(request.body);
    await reorderTasks(request.user.sub, npcId, taskIds);
    return reply.code(204).send();
  });

  app.put("/admin/tasks/:taskId", async (request) => {
    const { taskId } = z.object({ taskId: id }).parse(request.params);
    return updateTask(request.user.sub, taskId, taskInputSchema.parse(request.body));
  });

  app.delete("/admin/tasks/:taskId", async (request, reply) => {
    const { taskId } = z.object({ taskId: id }).parse(request.params);
    await deleteTask(request.user.sub, taskId);
    return reply.code(204).send();
  });
}
