import { randomInt } from "node:crypto";

/**
 * Sugere um usuário a partir do nome: primeiro + último nome, sem acentos.
 *   "João da Silva" → "joao.silva"     "Ana" → "ana"
 */
export function usernameFromName(name: string): string {
  const parts = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "aluno";
  const base = parts.length === 1 ? parts[0] : `${parts[0]}.${parts[parts.length - 1]}`;
  // Garante entre 3 e 30 caracteres.
  return base.length < 3 ? `${base}${"0".repeat(3 - base.length)}`.slice(0, 30) : base.slice(0, 30);
}

/** Escolhe o primeiro usuário livre: base, base2, base3... */
export function firstFreeUsername(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const suffix = String(n);
    const candidate = base.slice(0, 30 - suffix.length) + suffix;
    if (!taken.has(candidate)) return candidate;
  }
}

// Palavras curtas e fáceis de digitar (sem acento, sem letras parecidas).
const WORDS = [
  "sol", "lua", "mar", "rio", "gato", "peixe", "tigre", "leao", "onca", "arara",
  "bola", "nuvem", "flor", "folha", "pedra", "ponte", "trem", "barco", "fogo", "vento",
  "sapo", "pato", "urso", "lobo", "coruja", "baleia", "foguete", "estrela", "cometa", "dado",
  "pipa", "bolo", "mel", "uva", "caju", "milho", "tatu", "zebra", "panda", "golfinho",
];

/**
 * Gera uma senha fácil para crianças, mas difícil de adivinhar:
 * duas palavras + dois dígitos (ex.: "gatonuvem47") → 40 × 40 × 90 = 144.000 combinações.
 */
export function generatePassword(): string {
  const w1 = WORDS[randomInt(WORDS.length)];
  let w2 = WORDS[randomInt(WORDS.length)];
  while (w2 === w1) w2 = WORDS[randomInt(WORDS.length)];
  return `${w1}${w2}${randomInt(10, 100)}`;
}
