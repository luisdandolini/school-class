/** Tipos usados pelo painel do professor (/api/admin). */
import type { AdminNpc } from "./content.js";

export interface WorldRef {
  id: string;
  name: string;
}

export interface AdminStudent {
  id: string;
  name: string;
  username: string;
  xp: number;
  level: number;
  createdAt: string;
  /** Mundos DO PROFESSOR em que o aluno está matriculado. */
  worlds: WorldRef[];
  /** true se foi este professor que cadastrou (só ele pode excluir). */
  createdByMe: boolean;
}

export interface AdminWorld {
  id: string;
  name: string;
  description: string;
  mapKey: string;
  studentCount: number;
  npcCount: number;
  taskCount: number;
}

export interface AdminWorldDetail extends AdminWorld {
  npcs: AdminNpc[];
}

export interface CreateStudentRequest {
  name: string;
  /** Opcional: se vazio, é gerado a partir do nome (ex.: "joao.silva"). */
  username?: string;
  /** Opcional: se vazia, é gerada (ex.: "gatonuvem47"). */
  password?: string;
  /** Mundos em que o aluno já entra matriculado. */
  worldIds?: string[];
}

export interface UpdateStudentRequest {
  name?: string;
  username?: string;
}

export interface BulkCreateStudentsRequest {
  /** Um nome por aluno (até 60). */
  names: string[];
  worldId?: string;
}

/** Usuário e senha para entregar ao aluno. A senha só aparece neste momento. */
export interface StudentCredentials {
  id: string;
  name: string;
  username: string;
  password: string;
}

/** Regras de usuário (as mesmas no painel e no backend). */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
export const PASSWORD_MIN_LENGTH = 6;
