/** "agora", "há 5 min", "há 3 h", "há 2 dias", ou a data. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "nunca";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) {
    const d = Math.floor(diff / 86400);
    return `há ${d} dia${d > 1 ? "s" : ""}`;
  }
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Avisa o menu que a fila de correções mudou (para atualizar o contador). */
export const REVIEWS_CHANGED = "reviews-changed";
