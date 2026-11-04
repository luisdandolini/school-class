import { describe, expect, it } from "vitest";
import { gradeAnswer, normalizeAnswer } from "./grading.js";

describe("normalizeAnswer", () => {
  it("ignora maiúsculas, acentos, espaços e pontuação final", () => {
    expect(normalizeAnswer("  Brasília. ")).toBe("brasilia");
    expect(normalizeAnswer("São   Paulo!")).toBe("sao paulo");
    expect(normalizeAnswer("AÇÃO")).toBe("acao");
  });
});

describe("gradeAnswer", () => {
  const mc = { type: "MULTIPLE_CHOICE" as const, answer: "Brasília" };
  const tf = { type: "TRUE_FALSE" as const, answer: "true" };
  const fill = { type: "FILL_BLANK" as const, answer: "56|cinquenta e seis" };

  it("múltipla escolha: aceita a alternativa certa", () => {
    expect(gradeAnswer(mc, "Brasília")).toBe(true);
    expect(gradeAnswer(mc, "brasilia")).toBe(true);
  });

  it("múltipla escolha: recusa alternativa errada", () => {
    expect(gradeAnswer(mc, "São Paulo")).toBe(false);
  });

  it("verdadeiro/falso", () => {
    expect(gradeAnswer(tf, "true")).toBe(true);
    expect(gradeAnswer(tf, "false")).toBe(false);
  });

  it("completar lacuna: aceita qualquer alternativa separada por |", () => {
    expect(gradeAnswer(fill, "56")).toBe(true);
    expect(gradeAnswer(fill, " 56 ")).toBe(true);
    expect(gradeAnswer(fill, "Cinquenta e Seis")).toBe(true);
    expect(gradeAnswer(fill, "57")).toBe(false);
  });

  it("resposta vazia é sempre errada", () => {
    expect(gradeAnswer(fill, "   ")).toBe(false);
    expect(gradeAnswer({ type: "FILL_BLANK", answer: "" }, "")).toBe(false);
  });

  it("tarefa sem resposta cadastrada nunca é aceita", () => {
    expect(gradeAnswer({ type: "MULTIPLE_CHOICE", answer: null }, "qualquer")).toBe(false);
  });

  it("tarefa aberta não é corrigida automaticamente", () => {
    expect(() => gradeAnswer({ type: "OPEN", answer: null }, "texto")).toThrow();
  });
});
