import {
  levelFromXp,
  type NpcProgress,
  type NpcTask,
  type Role,
  type TaskResult,
  type TaskStatus,
} from "@school-class/shared";
import { prisma } from "../../db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { toAuthUser } from "../auth/auth.service.js";
import { accessibleWorlds } from "../worlds/access.js";
import { gradeAnswer } from "./grading.js";

type SessionUser = { sub: string; role: Role };

/** Campos da tarefa que podem ir para o jogo (sem `answer`!). */
const publicTaskSelect = {
  id: true,
  npcId: true,
  type: true,
  prompt: true,
  options: true,
  xpReward: true,
  order: true,
} as const;

export class NotFoundError extends Error {}

/** Situação de cada tarefa para o usuário: concluída, aguardando professor ou disponível. */
async function statusByTask(userId: string, taskIds: string[]): Promise<Map<string, TaskStatus>> {
  const [completions, pending] = await Promise.all([
    prisma.taskCompletion.findMany({ where: { userId, taskId: { in: taskIds } }, select: { taskId: true } }),
    prisma.submission.findMany({
      where: { userId, taskId: { in: taskIds }, correct: null },
      select: { taskId: true },
    }),
  ]);
  const status = new Map<string, TaskStatus>(taskIds.map((id) => [id, "AVAILABLE"]));
  for (const { taskId } of pending) status.set(taskId, "PENDING_REVIEW");
  for (const { taskId } of completions) status.set(taskId, "COMPLETED");
  return status;
}

/** Tarefas de um NPC, em ordem, com a situação do aluno em cada uma. */
export async function listNpcTasks(user: SessionUser, npcId: string): Promise<NpcTask[]> {
  const npc = await prisma.npc.findFirst({
    where: { id: npcId, world: accessibleWorlds(user) },
    select: { tasks: { select: publicTaskSelect, orderBy: { order: "asc" } } },
  });
  if (!npc) throw new NotFoundError("NPC não encontrado");

  const status = await statusByTask(user.sub, npc.tasks.map((t) => t.id));
  return npc.tasks.map((t) => ({ ...t, status: status.get(t.id) ?? "AVAILABLE" }));
}

/** Progresso do usuário em cada NPC de um mundo (para os marcadores no mapa). */
export async function progressByNpc(userId: string, worldId: string): Promise<Map<string, NpcProgress>> {
  const tasks = await prisma.task.findMany({ where: { npc: { worldId } }, select: { id: true, npcId: true } });
  const status = await statusByTask(userId, tasks.map((t) => t.id));

  const progress = new Map<string, NpcProgress>();
  for (const t of tasks) {
    const p = progress.get(t.npcId) ?? { total: 0, completed: 0, pendingReview: 0 };
    p.total++;
    if (status.get(t.id) === "COMPLETED") p.completed++;
    if (status.get(t.id) === "PENDING_REVIEW") p.pendingReview++;
    progress.set(t.npcId, p);
  }
  return progress;
}

/** Recebe a resposta do aluno, corrige e concede XP (uma única vez por tarefa). */
export async function submitAnswer(user: SessionUser, taskId: string, answer: string): Promise<TaskResult> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, npc: { world: accessibleWorlds(user) } },
  });
  if (!task) throw new NotFoundError("Tarefa não encontrada");

  const userId = user.sub;
  const result = async (outcome: TaskResult["outcome"], xpGained = 0): Promise<TaskResult> => {
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const leveledUp = xpGained > 0 && levelFromXp(u.xp) > levelFromXp(u.xp - xpGained);
    return { taskId, outcome, xpGained, leveledUp, user: toAuthUser(u) };
  };

  // Já concluída? Não corrige de novo nem dá XP.
  const done = await prisma.taskCompletion.findUnique({ where: { userId_taskId: { userId, taskId } } });
  if (done) return result("ALREADY_COMPLETED");

  // Resposta aberta: guarda para o professor corrigir (uma pendente por vez).
  if (task.type === "OPEN") {
    const pending = await prisma.submission.findFirst({ where: { userId, taskId, correct: null } });
    if (!pending) await prisma.submission.create({ data: { userId, taskId, answer, correct: null } });
    return result("PENDING_REVIEW");
  }

  // Correção automática. Toda tentativa fica registrada (útil para o professor depois).
  if (!gradeAnswer(task, answer)) {
    await prisma.submission.create({ data: { userId, taskId, answer, correct: false } });
    return result("WRONG");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // A chave única (userId, taskId) faz o segundo envio simultâneo falhar aqui.
      await tx.taskCompletion.create({ data: { userId, taskId, xpGained: task.xpReward } });
      await tx.submission.create({
        data: { userId, taskId, answer, correct: true, xpGained: task.xpReward },
      });
      await tx.user.update({ where: { id: userId }, data: { xp: { increment: task.xpReward } } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return result("ALREADY_COMPLETED");
    }
    throw err;
  }
  return result("CORRECT", task.xpReward);
}
