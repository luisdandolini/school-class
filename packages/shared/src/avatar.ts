/**
 * Aparência do personagem do aluno.
 *
 * A arte base (assets/avatar-base.png) tem uma faixa por penteado. Em cada faixa,
 * 4 colunas de camadas (AVATAR_LAYERS), cada uma com 3 quadros x 4 direções de 16x16:
 * a base já colorida (contorno, olhos, calça, sapato) e máscaras brancas de cabelo,
 * pele e roupa, que o jogo e o painel pintam com as cores escolhidas.
 * (Pintar máscaras não depende de ler pixels do canvas — alguns navegadores, como o
 * Brave, embaralham essa leitura por privacidade.)
 */

export const HAIR_STYLES = [
  { id: 0, name: "Curto" },
  { id: 1, name: "Comprido" },
  { id: 2, name: "Volumoso" },
  { id: 3, name: "Raspado" },
] as const;

export const SKIN_TONES = ["#f3cfab", "#e0ac7e", "#c68a5e", "#8d5a3b", "#5e3a26"] as const;

export const HAIR_COLORS = [
  "#563622", // castanho
  "#2a2430", // preto
  "#d9b44a", // loiro
  "#b5502e", // ruivo
  "#d8d8e4", // grisalho
  "#4f6fd8", // azul
  "#d16bb0", // rosa
] as const;

export const SHIRT_COLORS = [
  "#3e70ce", // azul
  "#d6474f", // vermelho
  "#3e9a5c", // verde
  "#f0b429", // amarelo
  "#8a4cc0", // roxo
  "#f07c2a", // laranja
  "#2fb5b5", // turquesa
  "#4a4f5c", // cinza
] as const;

export interface Avatar {
  style: number;
  skin: number;
  hair: number;
  shirt: number;
}

/** Usado por quem ainda não escolheu (é o boneco azul de antes). */
export const DEFAULT_AVATAR: Avatar = { style: 0, skin: 0, hair: 0, shirt: 0 };

const LIMITS: Record<keyof Avatar, number> = {
  style: HAIR_STYLES.length,
  skin: SKIN_TONES.length,
  hair: HAIR_COLORS.length,
  shirt: SHIRT_COLORS.length,
};

/** Confere um avatar vindo de fora (banco, rede). Retorna null se for inválido. */
export function parseAvatar(value: unknown): Avatar | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const out = {} as Avatar;
  for (const key of Object.keys(LIMITS) as (keyof Avatar)[]) {
    const n = v[key];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n >= LIMITS[key]) return null;
    out[key] = n;
  }
  return out;
}

export function randomAvatar(rand: () => number = Math.random): Avatar {
  const pick = (n: number) => Math.floor(rand() * n);
  return { style: pick(LIMITS.style), skin: pick(LIMITS.skin), hair: pick(LIMITS.hair), shirt: pick(LIMITS.shirt) };
}

/** Nome único por combinação (ex.: chave de textura "avatar-1-2-0-5"). */
export function avatarKey(a: Avatar): string {
  return `avatar-${a.style}-${a.skin}-${a.hair}-${a.shirt}`;
}

// ---------- camadas ----------

export const AVATAR_LAYERS = ["base", "hair", "skin", "shirt"] as const;

export const AVATAR_FRAME = 16;
/** Tamanho de uma camada de um penteado: 3 quadros x 4 direções. */
export const AVATAR_SHEET = { width: AVATAR_FRAME * 3, height: AVATAR_FRAME * 4 } as const;

/** Cor de cada máscara para este avatar. */
export function avatarColors(a: Avatar): { hair: string; skin: string; shirt: string } {
  return {
    hair: HAIR_COLORS[a.hair] ?? HAIR_COLORS[0],
    skin: SKIN_TONES[a.skin] ?? SKIN_TONES[0],
    shirt: SHIRT_COLORS[a.shirt] ?? SHIRT_COLORS[0],
  };
}

/** Onde fica, na arte base, uma camada de um penteado. */
export function avatarLayerOrigin(style: number, layer: (typeof AVATAR_LAYERS)[number]): { x: number; y: number } {
  return { x: AVATAR_LAYERS.indexOf(layer) * AVATAR_SHEET.width, y: style * AVATAR_SHEET.height };
}
