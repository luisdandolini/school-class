import type { PublicWorld, WorldDetail } from "@school-class/shared";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar ${path}`);
  return (await res.json()) as T;
}

export const api = {
  listWorlds: () => get<PublicWorld[]>("/worlds"),
  getWorld: (id: string) => get<WorldDetail>(`/worlds/${id}`),
};
