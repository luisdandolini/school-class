import { describe, expect, it } from "vitest";
import { PASSWORD_MIN_LENGTH, USERNAME_PATTERN } from "@school-class/shared";
import { firstFreeUsername, generatePassword, usernameFromName } from "./credentials.js";

describe("usernameFromName", () => {
  it("usa primeiro e último nome, sem acentos", () => {
    expect(usernameFromName("João da Silva")).toBe("joao.silva");
    expect(usernameFromName("  Ana  ")).toBe("ana");
    expect(usernameFromName("Maria Conceição Ávila")).toBe("maria.avila");
  });

  it("sempre gera um usuário válido", () => {
    for (const name of ["Li", "Ö", "!!!", "Pedro D'Ávila-Souza", "A".repeat(80)]) {
      expect(usernameFromName(name)).toMatch(USERNAME_PATTERN);
    }
  });
});

describe("firstFreeUsername", () => {
  it("adiciona número quando o usuário já existe", () => {
    expect(firstFreeUsername("ana", new Set())).toBe("ana");
    expect(firstFreeUsername("ana", new Set(["ana"]))).toBe("ana2");
    expect(firstFreeUsername("ana", new Set(["ana", "ana2", "ana3"]))).toBe("ana4");
  });

  it("respeita o limite de 30 caracteres", () => {
    const base = "a".repeat(30);
    expect(firstFreeUsername(base, new Set([base]))).toHaveLength(30);
  });
});

describe("generatePassword", () => {
  it("gera senhas válidas, só com letras minúsculas e números", () => {
    for (let i = 0; i < 200; i++) {
      const p = generatePassword();
      expect(p.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
      expect(p).toMatch(/^[a-z]+[0-9]{2}$/);
    }
  });

  it("varia bastante", () => {
    const set = new Set(Array.from({ length: 200 }, generatePassword));
    expect(set.size).toBeGreaterThan(190);
  });
});
