import type { AchievementId } from "@school-class/shared";

/** O que sabemos sobre o aluno no momento em que algo aconteceu. */
export interface Facts {
  /** Total de tarefas concluídas (em todos os mundos). */
  completedCount?: number;
  level?: number;
  /** As últimas 5 respostas corrigidas automaticamente estão todas certas? */
  fiveInARow?: boolean;
  /** Acertou agora uma tarefa em que já tinha errado? */
  recoveredFromWrong?: boolean;
  /** Mundos em que todas as tarefas foram concluídas. */
  completedWorldIds?: string[];
  openAnswerApproved?: boolean;
  sentEmote?: boolean;
}

export interface Grant {
  id: AchievementId;
  worldId?: string;
}

/** Regras das conquistas: a partir dos fatos, quais o aluno merece (ganhas antes são ignoradas depois). */
export function achievementsFor(f: Facts): Grant[] {
  const out: Grant[] = [];
  const done = f.completedCount ?? 0;
  if (done >= 1) out.push({ id: "primeiro-passo" });
  if (done >= 10) out.push({ id: "dedicacao" });
  if (done >= 25) out.push({ id: "incansavel" });
  if (f.recoveredFromWrong) out.push({ id: "volta-por-cima" });
  if (f.fiveInARow) out.push({ id: "em-chamas" });
  if (f.openAnswerApproved) out.push({ id: "ideia-aprovada" });
  if ((f.level ?? 0) >= 5) out.push({ id: "nivel-5" });
  if ((f.level ?? 0) >= 10) out.push({ id: "nivel-10" });
  for (const worldId of f.completedWorldIds ?? []) out.push({ id: "mundo-concluido", worldId });
  if (f.sentEmote) out.push({ id: "simpatia" });
  return out;
}
