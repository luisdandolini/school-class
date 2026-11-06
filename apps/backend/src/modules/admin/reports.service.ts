import { levelFromXp, parseAvatar, type EarnedAchievement, type StudentTaskProgress, type WorldReport } from "@school-class/shared";
import { prisma } from "../../db.js";
import { HttpError } from "../../lib/http-error.js";
import { listAchievements } from "../achievements/achievements.service.js";

async function ownWorld(teacherId: string, worldId: string) {
  const world = await prisma.world.findFirst({ where: { id: worldId, ownerId: teacherId } });
  if (!world) throw new HttpError(404, "Mundo não encontrado");
  return world;
}

/** Relatório do mundo: progresso de cada aluno matriculado e as tarefas mais difíceis. */
export async function worldReport(teacherId: string, worldId: string): Promise<WorldReport> {
  await ownWorld(teacherId, worldId);

  const [tasks, enrollments] = await Promise.all([
    prisma.task.findMany({ where: { npc: { worldId } }, include: { npc: { select: { name: true } } } }),
    prisma.enrollment.findMany({ where: { worldId }, include: { user: true } }),
  ]);
  const taskIds = tasks.map((t) => t.id);
  const userIds = enrollments.map((e) => e.userId);

  const [completions, submissions, medals] = await Promise.all([
    prisma.taskCompletion.findMany({ where: { taskId: { in: taskIds } }, select: { userId: true, taskId: true } }),
    prisma.submission.findMany({
      where: { taskId: { in: taskIds } },
      select: { userId: true, taskId: true, correct: true, createdAt: true },
    }),
    prisma.achievement.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: { _all: true } }),
  ]);

  const students = enrollments
    .map(({ user }) => {
      const subs = submissions.filter((s) => s.userId === user.id);
      const last = subs.reduce<Date | null>((max, s) => (!max || s.createdAt > max ? s.createdAt : max), null);
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: parseAvatar(user.avatar),
        xp: user.xp,
        level: levelFromXp(user.xp),
        completed: completions.filter((c) => c.userId === user.id).length,
        total: tasks.length,
        pendingReview: subs.filter((s) => s.correct === null).length,
        wrongAttempts: subs.filter((s) => s.correct === false).length,
        lastActivity: last?.toISOString() ?? null,
        achievements: medals.find((m) => m.userId === user.id)?._count._all ?? 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  // Só conta respostas de alunos ainda matriculados.
  const enrolled = new Set(userIds);
  const taskRows = tasks
    .map((t) => {
      const subs = submissions.filter((s) => s.taskId === t.id && enrolled.has(s.userId));
      const graded = subs.filter((s) => s.correct !== null);
      const wrong = graded.filter((s) => s.correct === false).length;
      return {
        id: t.id,
        prompt: t.prompt,
        type: t.type,
        npcName: t.npc.name,
        attempts: subs.length,
        wrong,
        completed: completions.filter((c) => c.taskId === t.id && enrolled.has(c.userId)).length,
        errorRate: graded.length > 0 ? wrong / graded.length : null,
      };
    })
    // Mais difíceis primeiro; as sem respostas vão para o fim.
    .sort((a, b) => (b.errorRate ?? -1) - (a.errorRate ?? -1) || b.attempts - a.attempts);

  return { totalTasks: tasks.length, students, tasks: taskRows };
}

/** Tarefa por tarefa: o que um aluno respondeu num mundo. */
export async function studentProgress(teacherId: string, worldId: string, studentId: string): Promise<StudentTaskProgress[]> {
  await ownWorld(teacherId, worldId);
  const enrolled = await prisma.enrollment.findUnique({ where: { userId_worldId: { userId: studentId, worldId } } });
  if (!enrolled) throw new HttpError(404, "Aluno não está neste mundo");

  const tasks = await prisma.task.findMany({
    where: { npc: { worldId } },
    orderBy: [{ npc: { name: "asc" } }, { order: "asc" }],
    include: {
      npc: { select: { name: true } },
      submissions: { where: { userId: studentId }, orderBy: { createdAt: "desc" } },
      completions: { where: { userId: studentId } },
    },
  });

  return tasks.map((t) => {
    const done = t.completions[0];
    const pending = t.submissions.find((s) => s.correct === null);
    const accepted = t.submissions.find((s) => s.correct === true) ?? pending;
    return {
      taskId: t.id,
      prompt: t.prompt,
      type: t.type,
      npcName: t.npc.name,
      status: done ? "COMPLETED" : pending ? "PENDING_REVIEW" : "AVAILABLE",
      attempts: t.submissions.length,
      wrongAnswers: t.submissions.filter((s) => s.correct === false).slice(0, 5).map((s) => s.answer),
      acceptedAnswer: accepted?.answer ?? null,
      xpGained: done?.xpGained ?? 0,
    };
  });
}

/**
 * Conquistas de um aluno matriculado num mundo do professor.
 * "Mundo concluído" de mundos de outros professores aparece sem o nome do mundo.
 */
export async function studentAchievements(teacherId: string, worldId: string, studentId: string): Promise<EarnedAchievement[]> {
  await ownWorld(teacherId, worldId);
  const enrolled = await prisma.enrollment.findUnique({ where: { userId_worldId: { userId: studentId, worldId } } });
  if (!enrolled) throw new HttpError(404, "Aluno não está neste mundo");
  const mine = new Set((await prisma.world.findMany({ where: { ownerId: teacherId }, select: { id: true } })).map((w) => w.id));
  return (await listAchievements(studentId)).map((a) =>
    a.worldId && !mine.has(a.worldId) ? { ...a, worldId: null, worldName: null } : a,
  );
}
