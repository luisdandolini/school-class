import {
  MAPS,
  type AdminNpc,
  type AdminTask,
  type AdminWorld,
  type AdminWorldDetail,
  type NpcInput,
  type TaskInput,
  type WorldInput,
} from "@school-class/shared";
import { prisma } from "../../db.js";
import { HttpError } from "../../lib/http-error.js";
import { fromTaskRow, toTaskData } from "./task-input.js";
import { listOwnWorlds } from "./worlds.service.js";

// ---------- verificações de dono ----------

async function ownWorld(teacherId: string, worldId: string) {
  const world = await prisma.world.findFirst({ where: { id: worldId, ownerId: teacherId } });
  if (!world) throw new HttpError(404, "Mundo não encontrado");
  return world;
}

async function ownNpc(teacherId: string, npcId: string) {
  const npc = await prisma.npc.findFirst({ where: { id: npcId, world: { ownerId: teacherId } }, include: { world: true } });
  if (!npc) throw new HttpError(404, "NPC não encontrado");
  return npc;
}

async function ownTask(teacherId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, npc: { world: { ownerId: teacherId } } } });
  if (!task) throw new HttpError(404, "Tarefa não encontrada");
  return task;
}

// ---------- mundos ----------

export async function getWorldDetail(teacherId: string, worldId: string): Promise<AdminWorldDetail> {
  await ownWorld(teacherId, worldId);
  const [summary] = (await listOwnWorlds(teacherId)).filter((w) => w.id === worldId);
  const npcs = await prisma.npc.findMany({
    where: { worldId },
    orderBy: { name: "asc" },
    include: { _count: { select: { tasks: true } } },
  });
  return {
    ...summary,
    npcs: npcs.map(
      (n): AdminNpc => ({
        id: n.id,
        worldId: n.worldId,
        name: n.name,
        greeting: n.greeting,
        sprite: n.sprite as AdminNpc["sprite"],
        x: n.x,
        y: n.y,
        taskCount: n._count.tasks,
      }),
    ),
  };
}

export async function createWorld(teacherId: string, input: WorldInput): Promise<AdminWorld> {
  const w = await prisma.world.create({ data: { ...input, ownerId: teacherId } });
  return { id: w.id, name: w.name, description: w.description, mapKey: w.mapKey, studentCount: 0, npcCount: 0, taskCount: 0, onlineCount: 0 };
}

export async function updateWorld(teacherId: string, worldId: string, input: Partial<WorldInput>) {
  const world = await ownWorld(teacherId, worldId);
  // Trocar o mapa pode deixar NPCs fora dele ou em cima de obstáculos.
  if (input.mapKey && input.mapKey !== world.mapKey) {
    const { width, height } = MAPS[input.mapKey];
    const outside = await prisma.npc.count({ where: { worldId, OR: [{ x: { gte: width } }, { y: { gte: height } }] } });
    if (outside > 0) throw new HttpError(409, `${outside} NPC(s) ficariam fora do novo mapa. Mova-os antes de trocar.`);
  }
  await prisma.world.update({ where: { id: worldId }, data: input });
  return getWorldDetail(teacherId, worldId);
}

/** Exclui o mundo com NPCs, tarefas, respostas e matrículas. O XP já ganho pelos alunos continua. */
export async function deleteWorld(teacherId: string, worldId: string) {
  await ownWorld(teacherId, worldId);
  await prisma.world.delete({ where: { id: worldId } });
}

// ---------- NPCs ----------

/** Confere se a posição está dentro do mapa e livre de outros NPCs. */
async function assertFreePosition(worldId: string, mapKey: string, x: number, y: number, ignoreNpcId?: string) {
  const map = MAPS[mapKey as keyof typeof MAPS];
  if (!map) throw new HttpError(409, "O mapa deste mundo não existe mais");
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    throw new HttpError(400, `A posição precisa estar dentro do mapa (0–${map.width - 1}, 0–${map.height - 1})`);
  }
  const taken = await prisma.npc.findFirst({ where: { worldId, x, y, NOT: ignoreNpcId ? { id: ignoreNpcId } : undefined } });
  if (taken) throw new HttpError(409, `Já existe um NPC nessa posição (${taken.name})`);
}

export async function createNpc(teacherId: string, worldId: string, input: NpcInput) {
  const world = await ownWorld(teacherId, worldId);
  await assertFreePosition(worldId, world.mapKey, input.x, input.y);
  const n = await prisma.npc.create({ data: { ...input, worldId } });
  return { ...input, id: n.id, worldId, taskCount: 0 } satisfies AdminNpc;
}

export async function updateNpc(teacherId: string, npcId: string, input: Partial<NpcInput>) {
  const npc = await ownNpc(teacherId, npcId);
  const x = input.x ?? npc.x;
  const y = input.y ?? npc.y;
  if (x !== npc.x || y !== npc.y) await assertFreePosition(npc.worldId, npc.world.mapKey, x, y, npcId);
  await prisma.npc.update({ where: { id: npcId }, data: input });
}

export async function deleteNpc(teacherId: string, npcId: string) {
  await ownNpc(teacherId, npcId);
  await prisma.npc.delete({ where: { id: npcId } });
}

// ---------- tarefas ----------

async function statsFor(taskIds: string[]) {
  const [attempts, completed, pending] = await Promise.all([
    prisma.submission.groupBy({ by: ["taskId"], where: { taskId: { in: taskIds } }, _count: true }),
    prisma.taskCompletion.groupBy({ by: ["taskId"], where: { taskId: { in: taskIds } }, _count: true }),
    prisma.submission.groupBy({ by: ["taskId"], where: { taskId: { in: taskIds }, correct: null }, _count: true }),
  ]);
  const get = (rows: { taskId: string; _count: number }[], id: string) => rows.find((r) => r.taskId === id)?._count ?? 0;
  return (id: string) => ({ attempts: get(attempts, id), completed: get(completed, id), pendingReview: get(pending, id) });
}

export async function listNpcTasksAdmin(teacherId: string, npcId: string): Promise<{ npc: AdminNpc; tasks: AdminTask[] }> {
  const npc = await ownNpc(teacherId, npcId);
  const rows = await prisma.task.findMany({ where: { npcId }, orderBy: { order: "asc" } });
  const stats = await statsFor(rows.map((t) => t.id));
  return {
    npc: {
      id: npc.id,
      worldId: npc.worldId,
      name: npc.name,
      greeting: npc.greeting,
      sprite: npc.sprite as AdminNpc["sprite"],
      x: npc.x,
      y: npc.y,
      taskCount: rows.length,
    },
    tasks: rows.map((t) => fromTaskRow(t, stats(t.id))),
  };
}

export async function createTask(teacherId: string, npcId: string, input: TaskInput): Promise<AdminTask> {
  await ownNpc(teacherId, npcId);
  const last = await prisma.task.findFirst({ where: { npcId }, orderBy: { order: "desc" }, select: { order: true } });
  const t = await prisma.task.create({ data: { ...toTaskData(input), npcId, order: (last?.order ?? 0) + 1 } });
  return fromTaskRow(t, { attempts: 0, completed: 0, pendingReview: 0 });
}

export async function updateTask(teacherId: string, taskId: string, input: TaskInput): Promise<AdminTask> {
  await ownTask(teacherId, taskId);
  const t = await prisma.task.update({ where: { id: taskId }, data: toTaskData(input) });
  return fromTaskRow(t, (await statsFor([taskId]))(taskId));
}

/** Exclui a tarefa e as respostas dela. O XP que os alunos já ganharam continua. */
export async function deleteTask(teacherId: string, taskId: string) {
  const task = await ownTask(teacherId, taskId);
  await prisma.$transaction([
    prisma.task.delete({ where: { id: taskId } }),
    // Fecha o "buraco" na ordem.
    prisma.task.updateMany({ where: { npcId: task.npcId, order: { gt: task.order } }, data: { order: { decrement: 1 } } }),
  ]);
}

/** Define a nova ordem das tarefas de um NPC (lista com todos os ids, na ordem desejada). */
export async function reorderTasks(teacherId: string, npcId: string, taskIds: string[]) {
  await ownNpc(teacherId, npcId);
  const current = await prisma.task.findMany({ where: { npcId }, select: { id: true } });
  const same = current.length === taskIds.length && new Set(taskIds).size === taskIds.length && current.every((t) => taskIds.includes(t.id));
  if (!same) throw new HttpError(400, "A lista precisa conter todas as tarefas do NPC, sem repetir");
  await prisma.$transaction(taskIds.map((id, i) => prisma.task.update({ where: { id }, data: { order: i + 1 } })));
}
