/**
 * Regras de progressão compartilhadas entre jogo e backend.
 * XP necessário para atingir o nível N: 100 * (N - 1)^1.5 (arredondado).
 * Nível 1 = 0 XP, nível 2 = 100 XP, nível 3 = 283 XP, nível 4 = 520 XP...
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.5));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

/** Progresso (0 a 1) dentro do nível atual — útil para a barra de XP. */
export function levelProgress(xp: number): number {
  const level = levelFromXp(xp);
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return (xp - start) / (end - start);
}
