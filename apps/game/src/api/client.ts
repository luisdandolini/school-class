import type { AuthUser, Avatar, LoginRequest, NpcTask, PublicWorld, TaskResult, WorldDetail } from "@school-class/shared";

/** Erro de API com o status HTTP (ex.: 401 = não logado). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  // O cookie de sessão (httpOnly) vai automaticamente: mesma origem.
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, data.error ?? `Erro ${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  login: (data: LoginRequest) => request<AuthUser>("POST", "/auth/login", data),
  logout: () => request<{ ok: true }>("POST", "/auth/logout"),
  /** Usuário logado, ou null se não houver sessão. */
  me: async (): Promise<AuthUser | null> => {
    try {
      return await request<AuthUser>("GET", "/auth/me");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
  setAvatar: (avatar: Avatar) => request<AuthUser>("PUT", "/auth/me/avatar", avatar),
  listWorlds: () => request<PublicWorld[]>("GET", "/worlds"),
  getWorld: (id: string) => request<WorldDetail>("GET", `/worlds/${id}`),
  npcTasks: (npcId: string) => request<NpcTask[]>("GET", `/npcs/${npcId}/tasks`),
  submitAnswer: (taskId: string, answer: string) =>
    request<TaskResult>("POST", `/tasks/${taskId}/submit`, { answer }),
};
