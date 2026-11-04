import { describe, expect, it } from "vitest";
import { gradeAnswer } from "../tasks/grading.js";
import { fromTaskRow, taskInputSchema, toTaskData } from "./task-input.js";

const parse = (v: unknown) => taskInputSchema.safeParse(v);
const firstError = (v: unknown) => {
  const r = parse(v);
  return r.success ? null : r.error.issues[0].message;
};

describe("validação de tarefas", () => {
  const mc = { type: "MULTIPLE_CHOICE", prompt: "Capital?", xpReward: 10, options: ["A", "B", "C"], answer: "B" };

  it("aceita uma múltipla escolha válida (e remove espaços)", () => {
    const r = parse({ ...mc, prompt: "  Capital?  ", options: [" A ", "B", "C"] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ prompt: "Capital?", options: ["A", "B", "C"] });
  });

  it("múltipla escolha: resposta precisa ser uma alternativa", () => {
    expect(firstError({ ...mc, answer: "D" })).toBe("A resposta correta precisa ser uma das alternativas");
  });

  it("múltipla escolha: recusa alternativas repetidas (ignorando acento/maiúscula)", () => {
    expect(firstError({ ...mc, options: ["Brasília", "brasilia", "Rio"], answer: "Rio" })).toBe("Há alternativas repetidas");
  });

  it("múltipla escolha: mínimo de 2 e máximo de 6 alternativas", () => {
    expect(firstError({ ...mc, options: ["A"], answer: "A" })).toBe("Use pelo menos 2 alternativas");
    expect(firstError({ ...mc, options: ["1", "2", "3", "4", "5", "6", "7"], answer: "1" })).toBe("Use no máximo 6 alternativas");
  });

  it("recusa alternativa vazia, pergunta vazia e XP fora do limite", () => {
    expect(firstError({ ...mc, options: ["A", "  ", "B"] })).toBe("Há uma alternativa vazia");
    expect(firstError({ ...mc, prompt: "   " })).toBe("Escreva a pergunta");
    expect(firstError({ ...mc, xpReward: 0 })).toBe("O XP deve ser pelo menos 1");
    expect(firstError({ ...mc, xpReward: 501 })).toBe("O XP deve ser no máximo 500");
    expect(firstError({ ...mc, xpReward: 2.5 })).toBe("O XP deve ser um número inteiro");
  });

  it("verdadeiro/falso só aceita true ou false", () => {
    expect(parse({ type: "TRUE_FALSE", prompt: "P", xpReward: 5, answer: "true" }).success).toBe(true);
    expect(parse({ type: "TRUE_FALSE", prompt: "P", xpReward: 5, answer: "talvez" }).success).toBe(false);
  });

  it("lacuna: não permite | nas respostas", () => {
    expect(firstError({ type: "FILL_BLANK", prompt: "P", xpReward: 5, acceptedAnswers: ["a|b"] })).toBe("Respostas não podem conter |");
  });

  it("tipo desconhecido é recusado", () => {
    expect(parse({ type: "ESSAY", prompt: "P", xpReward: 5 }).success).toBe(false);
  });
});

describe("conversão para o banco", () => {
  it("lacuna: junta respostas com | sem repetidas, e a correção aceita todas", () => {
    const data = toTaskData({ type: "FILL_BLANK", prompt: "7x8", xpReward: 5, acceptedAnswers: ["56", "cinquenta e seis", "Cinquenta e Seis"] });
    expect(data.answer).toBe("56|cinquenta e seis");
    expect(gradeAnswer(data, "56")).toBe(true);
    expect(gradeAnswer(data, "CINQUENTA E SEIS")).toBe(true);
  });

  it("ida e volta preserva os dados da lacuna", () => {
    const data = toTaskData({ type: "FILL_BLANK", prompt: "P", xpReward: 5, acceptedAnswers: ["a", "b"] });
    const back = fromTaskRow({ id: "1", npcId: "n", order: 1, ...data }, { attempts: 0, completed: 0, pendingReview: 0 });
    expect(back.acceptedAnswers).toEqual(["a", "b"]);
    expect(back.answer).toBeNull();
  });

  it("resposta aberta não guarda resposta; V/F não guarda alternativas", () => {
    expect(toTaskData({ type: "OPEN", prompt: "P", xpReward: 5 })).toMatchObject({ answer: null, options: [] });
    expect(toTaskData({ type: "TRUE_FALSE", prompt: "P", xpReward: 5, answer: "false" })).toMatchObject({ answer: "false", options: [] });
  });
});
