import {
  achievementDef,
  achievementKey,
  levelFromXp,
  type AchievementId,
  type EarnedAchievement,
} from "@school-class/shared";
import { prisma } from "../../db.js";
import { hub } from "../realtime/hub.js";
import { achievementsFor, type Facts } from "./rules.js";

/** O que aconteceu e pode render conquistas. */
export type AchievementEvent =
  | { kind: "task-correct"; taskId: string }
  | { kind: "open-approved"; taskId: string }
  | { kind: "emote" }
  /** Confere tudo o que já dá para saber pelo histórico (ex.: progresso feito antes das conquistas existirem). */
  | { kind: "sync" };

type Row = { key: string; worldId: string | null; earnedAt: Date; seenAt: Date | null; world: { name: string } | null };

function toEarned(r: Row): EarnedAchievement | null {
  const id = r.key.split(":")[0];
  if (!achievementDef(id)) return null; // conquista que deixou de existir
  return {
    key: r.key,
    id: id as AchievementId,
    worldId: r.worldId,
    worldName: r.world?.name ?? null,
    earnedAt: r.earnedAt.toISOString(),
    seen: r.seenAt !== null,
  };
}

const rowSelect = { key: true, worldId: true, earnedAt: true, seenAt: true, world: { select: { name: true } } } as const;

/** Junta os fatos sobre o aluno relevantes para o evento. */
async function gatherFacts(userId: string, event: AchievementEvent): Promise<Facts> {
  if (event.kind === "emote") return { sentEmote: true };
  if (event.kind === "sync") return gatherHistory(userId);

  const task = await prisma.task.findUnique({ where: { id: event.taskId }, select: { npc: { select: { worldId: true } } } });
  const worldId = task?.npc.worldId;
  const [user, completedCount, wrongBefore, worldTasks, worldDone, lastGraded] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }),
    prisma.taskCompletion.count({ where: { userId } }),
    prisma.submission.count({ where: { userId, taskId: event.taskId, correct: false } }),
    worldId ? prisma.task.count({ where: { npc: { worldId } } }) : 0,
    worldId ? prisma.taskCompletion.count({ where: { userId, task: { npc: { worldId } } } }) : 0,
    event.kind === "task-correct"
      ? prisma.submission.findMany({
          where: { userId, correct: { not: null }, task: { type: { not: "OPEN" } } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { correct: true },
        })
      : [],
  ]);
  return {
    completedCount,
    level: user ? levelFromXp(user.xp) : 1,
    recoveredFromWrong: wrongBefore > 0,
    fiveInARow: lastGraded.length === 5 && lastGraded.every((s) => s.correct === true),
    completedWorldIds: worldId && worldTasks > 0 && worldDone >= worldTasks ? [worldId] : [],
    openAnswerApproved: event.kind === "open-approved",
  };
}

/** Fatos a partir do histórico inteiro do aluno (sem a sequência de acertos, que só vale ao vivo). */
async function gatherHistory(userId: string): Promise<Facts> {
  const [user, completedCount, recovered, approved, worlds] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }),
    prisma.taskCompletion.count({ where: { userId } }),
    prisma.submission.count({ where: { userId, correct: false, task: { completions: { some: { userId } } } } }),
    prisma.submission.count({ where: { userId, correct: true, task: { type: "OPEN" } } }),
    prisma.world.findMany({
      where: { npcs: { some: { tasks: { some: { completions: { some: { userId } } } } } } },
      select: {
        id: true,
        npcs: { select: { tasks: { select: { completions: { where: { userId }, select: { taskId: true } } } } } },
      },
    }),
  ]);
  const completedWorldIds = worlds
    .filter((w) => {
      const tasks = w.npcs.flatMap((n) => n.tasks);
      return tasks.length > 0 && tasks.every((t) => t.completions.length > 0);
    })
    .map((w) => w.id);
  return {
    completedCount,
    level: user ? levelFromXp(user.xp) : 1,
    recoveredFromWrong: recovered > 0,
    openAnswerApproved: approved > 0,
    completedWorldIds,
  };
}

/**
 * Confere e grava as conquistas novas depois de um evento.
 * Retorna só as que o aluno acabou de ganhar, e avisa os colegas online.
 */
export async function awardAchievements(userId: string, event: AchievementEvent): Promise<EarnedAchievement[]> {
  const grants = achievementsFor(await gatherFacts(userId, event));
  if (grants.length === 0) return [];

  const keys = grants.map((g) => achievementKey(g.id, g.worldId));
  const existing = new Set(
    (await prisma.achievement.findMany({ where: { userId, key: { in: keys } }, select: { key: true } })).map((a) => a.key),
  );
  const fresh = grants.filter((g) => !existing.has(achievementKey(g.id, g.worldId)));
  if (fresh.length === 0) return [];

  // skipDuplicates: dois envios ao mesmo tempo não geram a mesma conquista duas vezes.
  await prisma.achievement.createMany({
    data: fresh.map((g) => ({ userId, key: achievementKey(g.id, g.worldId), worldId: g.worldId ?? null })),
    skipDuplicates: true,
  });
  const rows = await prisma.achievement.findMany({
    where: { userId, key: { in: fresh.map((g) => achievementKey(g.id, g.worldId)) } },
    select: rowSelect,
  });
  const earned = rows.map(toEarned).filter((a): a is EarnedAchievement => a !== null);
  // Na conferência do histórico não avisa os colegas (seria uma enxurrada de avisos ao entrar).
  if (event.kind !== "sync") hub.achievements(userId, earned);
  return earned;
}

/** Não deixa um problema nas conquistas atrapalhar a resposta do aluno. */
export async function awardAchievementsSafely(userId: string, event: AchievementEvent): Promise<EarnedAchievement[]> {
  try {
    return await awardAchievements(userId, event);
  } catch (err) {
    console.error("Falha ao conferir conquistas", err);
    return [];
  }
}

export async function listAchievements(userId: string): Promise<EarnedAchievement[]> {
  const rows = await prisma.achievement.findMany({ where: { userId }, orderBy: { earnedAt: "asc" }, select: rowSelect });
  return rows.map(toEarned).filter((a): a is EarnedAchievement => a !== null);
}

export async function markSeen(userId: string, keys: string[]) {
  await prisma.achievement.updateMany({ where: { userId, key: { in: keys }, seenAt: null }, data: { seenAt: new Date() } });
}
