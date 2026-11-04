import type { TaskType } from "@school-class/shared";

/**
 * Normaliza uma resposta para comparação:
 * ignora maiúsculas, acentos, espaços extras e pontuação final.
 *   "  Brasília. " → "brasilia"
 */
export function normalizeAnswer(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?;,]+$/, "")
    .trim();
}

interface GradableTask {
  type: TaskType;
  /** Resposta correta. FILL_BLANK aceita alternativas separadas por "|". */
  answer: string | null;
}

/**
 * Corrige automaticamente uma resposta.
 * Tarefas OPEN não são corrigidas aqui (vão para o professor).
 */
export function gradeAnswer(task: GradableTask, given: string): boolean {
  if (task.type === "OPEN") throw new Error("Tarefas abertas são corrigidas pelo professor");
  if (task.answer == null) return false;

  const answer = normalizeAnswer(given);
  if (!answer) return false;

  const accepted = task.type === "FILL_BLANK" ? task.answer.split("|") : [task.answer];
  return accepted.some((a) => normalizeAnswer(a) === answer);
}
