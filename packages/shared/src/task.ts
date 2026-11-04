import type { AuthUser } from "./auth.js";

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
  options: string[];
  xpReward: number;
  order: number;
}

/**
 * Situação de uma tarefa para o aluno logado:
 * - AVAILABLE: pode responder
 * - PENDING_REVIEW: resposta aberta enviada, aguardando o professor
 * - COMPLETED: concluída (XP já ganho)
 */
export type TaskStatus = "AVAILABLE" | "PENDING_REVIEW" | "COMPLETED";

export interface NpcTask extends PublicTask {
  status: TaskStatus;
  /** Resposta aberta já corrigida: resultado e comentário do professor. */
  review?: { correct: boolean; feedback: string | null };
}

/** Valores enviados para tarefas TRUE_FALSE. */
export const TRUE_FALSE_VALUES = { true: "true", false: "false" } as const;

/** O que o aluno envia ao responder uma tarefa. */
export interface TaskAnswer {
  answer: string;
}

/**
 * Resultado da correção:
 * - CORRECT: acertou (ganhou XP)
 * - WRONG: errou (pode tentar de novo)
 * - PENDING_REVIEW: resposta aberta enviada para o professor
 * - ALREADY_COMPLETED: já tinha concluído antes (sem XP extra)
 */
export type TaskOutcome = "CORRECT" | "WRONG" | "PENDING_REVIEW" | "ALREADY_COMPLETED";

export interface TaskResult {
  taskId: string;
  outcome: TaskOutcome;
  xpGained: number;
  leveledUp: boolean;
  /** Usuário atualizado (XP e nível), para o HUD. */
  user: AuthUser;
}
