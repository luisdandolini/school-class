import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "@school-class/shared";
import { achievementsFor } from "./rules.js";

const ids = (f: Parameters<typeof achievementsFor>[0]) => achievementsFor(f).map((g) => g.id);

describe("regras das conquistas", () => {
  it("nada acontece sem fatos", () => {
    expect(achievementsFor({})).toEqual([]);
  });

  it("tarefas concluídas", () => {
    expect(ids({ completedCount: 1 })).toEqual(["primeiro-passo"]);
    expect(ids({ completedCount: 10 })).toEqual(["primeiro-passo", "dedicacao"]);
    expect(ids({ completedCount: 25 })).toEqual(["primeiro-passo", "dedicacao", "incansavel"]);
  });

  it("nível, sequência, persistência e resposta livre", () => {
    expect(ids({ level: 4 })).toEqual([]);
    expect(ids({ level: 5 })).toEqual(["nivel-5"]);
    expect(ids({ level: 12 })).toEqual(["nivel-5", "nivel-10"]);
    expect(ids({ fiveInARow: true })).toEqual(["em-chamas"]);
    expect(ids({ recoveredFromWrong: true })).toEqual(["volta-por-cima"]);
    expect(ids({ openAnswerApproved: true })).toEqual(["ideia-aprovada"]);
    expect(ids({ sentEmote: true })).toEqual(["simpatia"]);
  });

  it("mundo concluído é por mundo", () => {
    expect(achievementsFor({ completedWorldIds: ["m1", "m2"] })).toEqual([
      { id: "mundo-concluido", worldId: "m1" },
      { id: "mundo-concluido", worldId: "m2" },
    ]);
    expect(achievementsFor({ completedWorldIds: [] })).toEqual([]);
  });

  it("toda regra corresponde a uma conquista cadastrada", () => {
    const all = achievementsFor({
      completedCount: 99, level: 99, fiveInARow: true, recoveredFromWrong: true,
      completedWorldIds: ["m"], openAnswerApproved: true, sentEmote: true,
    }).map((g) => g.id);
    expect(new Set(all)).toEqual(new Set(ACHIEVEMENTS.map((a) => a.id)));
  });
});
