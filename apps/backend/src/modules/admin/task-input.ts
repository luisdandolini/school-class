import { LIMITS, type AdminTask, type TaskInput } from "@school-class/shared";
import { z } from "zod";
import { normalizeAnswer } from "../tasks/grading.js";

const prompt = z.string().trim().min(1, "Escreva a pergunta").max(LIMITS.prompt, "Pergunta muito longa");
const xpReward = z.coerce
  .number()
  .int("O XP deve ser um número inteiro")
  .min(LIMITS.minXp, `O XP deve ser pelo menos ${LIMITS.minXp}`)
  .max(LIMITS.maxXp, `O XP deve ser no máximo ${LIMITS.maxXp}`);
const text = (max: number, empty: string) => z.string().trim().min(1, empty).max(max, "Texto muito longo");

/** Validação do formulário de tarefa, com regras específicas de cada tipo. */
export const taskInputSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("MULTIPLE_CHOICE"),
      prompt,
      xpReward,
      options: z
        .array(text(LIMITS.option, "Há uma alternativa vazia"))
        .min(LIMITS.minOptions, `Use pelo menos ${LIMITS.minOptions} alternativas`)
        .max(LIMITS.maxOptions, `Use no máximo ${LIMITS.maxOptions} alternativas`),
      answer: z.string().trim().min(1, "Marque a alternativa correta"),
    }),
    z.object({ type: z.literal("TRUE_FALSE"), prompt, xpReward, answer: z.enum(["true", "false"]) }),
    z.object({
      type: z.literal("FILL_BLANK"),
      prompt,
      xpReward,
      acceptedAnswers: z
        .array(
          text(LIMITS.option, "Há uma resposta vazia").refine((a) => !a.includes("|"), "Respostas não podem conter |"),
        )
        .min(1, "Informe pelo menos uma resposta aceita")
        .max(LIMITS.maxAcceptedAnswers, `No máximo ${LIMITS.maxAcceptedAnswers} respostas aceitas`),
    }),
    z.object({ type: z.literal("OPEN"), prompt, xpReward }),
  ])
  .superRefine((t, ctx) => {
    if (t.type === "MULTIPLE_CHOICE") {
      const norm = t.options.map(normalizeAnswer);
      if (new Set(norm).size !== norm.length) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "Há alternativas repetidas" });
      }
      if (!t.options.includes(t.answer)) {
        ctx.addIssue({ code: "custom", path: ["answer"], message: "A resposta correta precisa ser uma das alternativas" });
      }
    }
  }) satisfies z.ZodType<TaskInput, unknown>;

/** Converte o formulário para as colunas do banco. */
export function toTaskData(input: TaskInput) {
  switch (input.type) {
    case "MULTIPLE_CHOICE":
      return { type: input.type, prompt: input.prompt, xpReward: input.xpReward, options: input.options, answer: input.answer };
    case "TRUE_FALSE":
      return { type: input.type, prompt: input.prompt, xpReward: input.xpReward, options: [], answer: input.answer };
    case "FILL_BLANK": {
      // Remove repetidas (ignorando maiúsculas/acentos) e junta com "|".
      const seen = new Set<string>();
      const unique = input.acceptedAnswers.filter((a) => {
        const n = normalizeAnswer(a);
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      });
      return { type: input.type, prompt: input.prompt, xpReward: input.xpReward, options: [], answer: unique.join("|") };
    }
    case "OPEN":
      return { type: input.type, prompt: input.prompt, xpReward: input.xpReward, options: [], answer: null };
  }
}

/** Converte do banco para o formato do painel (respostas da lacuna separadas). */
export function fromTaskRow(
  t: { id: string; npcId: string; type: AdminTask["type"]; prompt: string; options: string[]; answer: string | null; xpReward: number; order: number },
  stats: AdminTask["stats"],
): AdminTask {
  const isFill = t.type === "FILL_BLANK";
  return {
    id: t.id,
    npcId: t.npcId,
    type: t.type,
    prompt: t.prompt,
    options: t.options,
    answer: isFill ? null : t.answer,
    acceptedAnswers: isFill && t.answer ? t.answer.split("|") : [],
    xpReward: t.xpReward,
    order: t.order,
    stats,
  };
}
