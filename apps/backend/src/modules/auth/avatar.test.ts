import { describe, expect, it } from "vitest";
import { AVATAR_SHEET, HAIR_COLORS, avatarColors, avatarLayerOrigin, parseAvatar, randomAvatar } from "@school-class/shared";

describe("avatar", () => {
  it("aceita só índices inteiros dentro das paletas", () => {
    expect(parseAvatar({ style: 1, skin: 2, hair: 3, shirt: 4 })).toEqual({ style: 1, skin: 2, hair: 3, shirt: 4 });
    expect(parseAvatar(null)).toBeNull();
    expect(parseAvatar({ style: 1, skin: 2, hair: 3 })).toBeNull();
    expect(parseAvatar({ style: 99, skin: 0, hair: 0, shirt: 0 })).toBeNull();
    expect(parseAvatar({ style: 1.5, skin: 0, hair: 0, shirt: 0 })).toBeNull();
    expect(parseAvatar({ style: "1", skin: 0, hair: 0, shirt: 0 })).toBeNull();
  });

  it("avatar sorteado é sempre válido", () => {
    for (let i = 0; i < 50; i++) expect(parseAvatar(randomAvatar())).not.toBeNull();
  });

  it("cores e posição das camadas na arte base", () => {
    expect(avatarColors({ style: 0, skin: 0, hair: 2, shirt: 0 }).hair).toBe(HAIR_COLORS[2]);
    expect(avatarLayerOrigin(2, "base")).toEqual({ x: 0, y: 2 * AVATAR_SHEET.height });
    expect(avatarLayerOrigin(1, "shirt")).toEqual({ x: 3 * AVATAR_SHEET.width, y: AVATAR_SHEET.height });
  });
});
