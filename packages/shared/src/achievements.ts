/** Conquistas (medalhas). As regras ficam no backend (modules/achievements). */

export const ACHIEVEMENTS = [
  { id: "primeiro-passo", icon: "👣", name: "Primeiro passo", description: "Concluiu a primeira tarefa." },
  { id: "volta-por-cima", icon: "💪", name: "Volta por cima", description: "Acertou uma tarefa depois de ter errado." },
  { id: "em-chamas", icon: "🔥", name: "Em chamas", description: "Acertou 5 respostas seguidas, sem errar no meio." },
  { id: "dedicacao", icon: "📚", name: "Dedicação", description: "Concluiu 10 tarefas." },
  { id: "incansavel", icon: "🚀", name: "Incansável", description: "Concluiu 25 tarefas." },
  { id: "ideia-aprovada", icon: "💡", name: "Ideia aprovada", description: "Teve uma resposta livre aprovada na correção." },
  { id: "nivel-5", icon: "⭐", name: "Nível 5", description: "Chegou ao nível 5." },
  { id: "nivel-10", icon: "🌟", name: "Nível 10", description: "Chegou ao nível 10." },
  { id: "mundo-concluido", icon: "🏆", name: "Mundo concluído", description: "Concluiu todas as tarefas de um mundo.", perWorld: true },
  { id: "simpatia", icon: "👋", name: "Simpatia", description: "Mandou um emote para os colegas." },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"];
export type AchievementDef = (typeof ACHIEVEMENTS)[number];

export function achievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Chave gravada no banco: o id, ou "id:mundo" para as conquistas por mundo. */
export function achievementKey(id: AchievementId, worldId?: string): string {
  return worldId ? `${id}:${worldId}` : id;
}

/** Uma conquista que o aluno ganhou. */
export interface EarnedAchievement {
  key: string;
  id: AchievementId;
  /** Só nas conquistas por mundo. */
  worldId: string | null;
  worldName: string | null;
  earnedAt: string;
  /** O aluno já viu a comemoração desta conquista? */
  seen: boolean;
}
