import { levelFromXp, type PendingReview, type ReviewResult } from "@school-class/shared";
import { prisma } from "../../db.js";
import { HttpError } from "../../lib/http-error.js";
import { hub } from "../realtime/hub.js";

/** Respostas abertas aguardando correção nos mundos do professor (mais antigas primeiro). */
export async function listPendingReviews(teacherId: string, worldId?: string): Promise<PendingReview[]> {
  const rows = await prisma.submission.findMany({
    where: {
      correct: null,
      task: { type: "OPEN", npc: { world: { ownerId: teacherId, ...(worldId ? { id: worldId } : {}) } } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, username: true } },
      task: { select: { id: true, prompt: true, xpReward: true, npc: { select: { id: true, name: true, world: { select: { id: true, name: true } } } } } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    answer: s.answer,
    createdAt: s.createdAt.toISOString(),
    student: s.user,
    task: { id: s.task.id, prompt: s.task.prompt, xpReward: s.task.xpReward },
    npc: { id: s.task.npc.id, name: s.task.npc.name },
    world: s.task.npc.world,
  }));
}

export async function countPendingReviews(teacherId: string): Promise<number> {
  return prisma.submission.count({
    where: { correct: null, task: { type: "OPEN", npc: { world: { ownerId: teacherId } } } },
  });
}

/**
 * Corrige uma resposta aberta. Se correta, o aluno ganha o XP (uma única vez).
 * Se não, o aluno pode responder de novo — e verá o comentário no jogo.
 */
export async function reviewSubmission(
  teacherId: string,
  submissionId: string,
  correct: boolean,
  feedback?: string,
): Promise<ReviewResult> {
  const sub = await prisma.submission.findFirst({
    where: { id: submissionId, task: { npc: { world: { ownerId: teacherId } } } },
    include: { task: true },
  });
  if (!sub) throw new HttpError(404, "Resposta não encontrada");
  if (sub.correct !== null) throw new HttpError(409, "Esta resposta já foi corrigida");

  const data = { correct, feedback: feedback?.trim() || null, reviewedAt: new Date() };

  const result = await prisma.$transaction(async (tx) => {
    // "Reserva" a correção: se outra aba/professor corrigiu ao mesmo tempo, count = 0.
    const claimed = await tx.submission.updateMany({ where: { id: submissionId, correct: null }, data });
    if (claimed.count === 0) throw new HttpError(409, "Esta resposta já foi corrigida");
    if (!correct) return { id: submissionId, correct, xpGained: 0, newXp: null as number | null };

    // ON CONFLICT DO NOTHING: se o aluno já tinha concluído (caso raro), count = 0 e não há XP de novo.
    // (Um erro de chave duplicada aqui invalidaria a transação inteira no PostgreSQL.)
    const created = await tx.taskCompletion.createMany({
      data: [{ userId: sub.userId, taskId: sub.taskId, xpGained: sub.task.xpReward }],
      skipDuplicates: true,
    });
    const xpGained = created.count === 1 ? sub.task.xpReward : 0;
    let newXp: number | null = null;
    if (xpGained > 0) {
      await tx.submission.update({ where: { id: submissionId }, data: { xpGained } });
      newXp = (await tx.user.update({ where: { id: sub.userId }, data: { xp: { increment: xpGained } } })).xp;
    }
    return { id: submissionId, correct, xpGained, newXp };
  });

  // Depois de gravar: se subiu de nível, avisa os colegas online.
  if (result.newXp !== null && levelFromXp(result.newXp) > levelFromXp(result.newXp - result.xpGained)) {
    hub.levelUp(sub.userId, levelFromXp(result.newXp));
  }
  return { id: result.id, correct: result.correct, xpGained: result.xpGained };
}
