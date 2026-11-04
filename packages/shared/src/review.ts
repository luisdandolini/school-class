import type { TaskStatus, TaskType } from "./task.js";

/** Resposta aberta aguardando correção, como o professor vê. */
export interface PendingReview {
  id: string;
  answer: string;
  createdAt: string;
  student: { id: string; name: string; username: string };
  task: { id: string; prompt: string; xpReward: number };
  npc: { id: string; name: string };
  world: { id: string; name: string };
}

export interface ReviewRequest {
  correct: boolean;
  /** Comentário opcional que o aluno verá ao falar com o NPC. */
  feedback?: string;
}

export interface ReviewResult {
  id: string;
  correct: boolean;
  xpGained: number;
}

export const FEEDBACK_MAX_LENGTH = 300;

/** Linha do relatório: um aluno num mundo. */
export interface StudentReportRow {
  id: string;
  name: string;
  username: string;
  xp: number;
  level: number;
  completed: number;
  total: number;
  pendingReview: number;
  wrongAttempts: number;
  lastActivity: string | null;
}

/** Linha do relatório: uma tarefa, para achar as mais difíceis. */
export interface TaskReportRow {
  id: string;
  prompt: string;
  type: TaskType;
  npcName: string;
  attempts: number;
  wrong: number;
  completed: number;
  /** wrong / (respostas corrigidas). null se ninguém respondeu ainda. */
  errorRate: number | null;
}

export interface WorldReport {
  totalTasks: number;
  students: StudentReportRow[];
  tasks: TaskReportRow[];
}

/** Progresso detalhado de um aluno num mundo. */
export interface StudentTaskProgress {
  taskId: string;
  prompt: string;
  type: TaskType;
  npcName: string;
  status: TaskStatus;
  attempts: number;
  /** Últimas respostas erradas (mais recentes primeiro). */
  wrongAnswers: string[];
  /** Resposta aceita (certa ou aguardando), se houver. */
  acceptedAnswer: string | null;
  xpGained: number;
}
