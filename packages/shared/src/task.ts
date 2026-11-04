/** Tipos de tarefa que um NPC pode passar ao aluno. */
export type TaskType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "OPEN";

/**
 * Tarefa como o JOGO a recebe.
 * Nunca contém a resposta certa: quem corrige é o backend.
 */
export interface PublicTask {
  id: string;
  npcId: string;
  type: TaskType;
  prompt: string;
  /** Alternativas (apenas para MULTIPLE_CHOICE). */
  options?: string[];
  xpReward: number;
  order: number;
}

/** O que o aluno envia ao responder uma tarefa. */
export interface TaskAnswer {
  taskId: string;
  answer: string;
}

/** Resultado devolvido pelo backend após corrigir. */
export interface TaskResult {
  taskId: string;
  /** null = resposta aberta aguardando correção do professor. */
  correct: boolean | null;
  xpGained: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
}
