import type {
  AdminNpc,
  AdminStudent,
  AdminTask,
  AdminWorld,
  AdminWorldDetail,
  AuthUser,
  BulkCreateStudentsRequest,
  CreateStudentRequest,
  LoginRequest,
  NpcInput,
  PendingReview,
  ReviewRequest,
  ReviewResult,
  StudentCredentials,
  StudentTaskProgress,
  TaskInput,
  UpdateStudentRequest,
  WorldInput,
  WorldReport,
} from "@school-class/shared";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `Erro ${res.status}`);
  return data as T;
}

/** Mensagem amigável para mostrar ao professor. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível conectar ao servidor. Tente novamente.";
}

export const api = {
  login: (data: LoginRequest) => request<AuthUser>("POST", "/auth/login", data),
  logout: () => request<{ ok: true }>("POST", "/auth/logout"),
  me: async () => {
    try {
      return await request<AuthUser>("GET", "/auth/me");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },

  students: (worldId?: string) =>
    request<AdminStudent[]>("GET", `/admin/students${worldId ? `?worldId=${encodeURIComponent(worldId)}` : ""}`),
  createStudent: (data: CreateStudentRequest) => request<StudentCredentials>("POST", "/admin/students", data),
  createStudentsBulk: (data: BulkCreateStudentsRequest) =>
    request<StudentCredentials[]>("POST", "/admin/students/bulk", data),
  updateStudent: (id: string, data: UpdateStudentRequest) =>
    request<AdminStudent>("PATCH", `/admin/students/${id}`, data),
  resetPassword: (id: string) => request<StudentCredentials>("POST", `/admin/students/${id}/reset-password`),
  deleteStudent: (id: string) => request<void>("DELETE", `/admin/students/${id}`),

  worlds: () => request<AdminWorld[]>("GET", "/admin/worlds"),
  world: (id: string) => request<AdminWorldDetail>("GET", `/admin/worlds/${id}`),
  createWorld: (data: WorldInput) => request<AdminWorld>("POST", "/admin/worlds", data),
  updateWorld: (id: string, data: Partial<WorldInput>) => request<AdminWorldDetail>("PATCH", `/admin/worlds/${id}`, data),
  deleteWorld: (id: string) => request<void>("DELETE", `/admin/worlds/${id}`),

  createNpc: (worldId: string, data: NpcInput) => request<AdminNpc>("POST", `/admin/worlds/${worldId}/npcs`, data),
  updateNpc: (id: string, data: Partial<NpcInput>) => request<void>("PATCH", `/admin/npcs/${id}`, data),
  deleteNpc: (id: string) => request<void>("DELETE", `/admin/npcs/${id}`),

  npcTasks: (npcId: string) => request<{ npc: AdminNpc; tasks: AdminTask[] }>("GET", `/admin/npcs/${npcId}/tasks`),
  createTask: (npcId: string, data: TaskInput) => request<AdminTask>("POST", `/admin/npcs/${npcId}/tasks`, data),
  updateTask: (id: string, data: TaskInput) => request<AdminTask>("PUT", `/admin/tasks/${id}`, data),
  deleteTask: (id: string) => request<void>("DELETE", `/admin/tasks/${id}`),
  reviews: (worldId?: string) =>
    request<PendingReview[]>("GET", `/admin/reviews${worldId ? `?worldId=${encodeURIComponent(worldId)}` : ""}`),
  reviewCount: () => request<{ pending: number }>("GET", "/admin/reviews/count"),
  review: (id: string, data: ReviewRequest) => request<ReviewResult>("POST", `/admin/reviews/${id}`, data),
  worldReport: (worldId: string) => request<WorldReport>("GET", `/admin/worlds/${worldId}/report`),
  studentProgress: (worldId: string, studentId: string) =>
    request<StudentTaskProgress[]>("GET", `/admin/worlds/${worldId}/students/${studentId}/progress`),

  reorderTasks: (npcId: string, taskIds: string[]) => request<void>("PUT", `/admin/npcs/${npcId}/tasks/order`, { taskIds }),

  enroll: (worldId: string, studentIds: string[]) =>
    request<void>("POST", `/admin/worlds/${worldId}/students`, { studentIds }),
  unenroll: (worldId: string, studentId: string) =>
    request<void>("DELETE", `/admin/worlds/${worldId}/students/${studentId}`),
};
