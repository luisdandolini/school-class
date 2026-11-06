import type { Avatar } from "./avatar.js";

export type Role = "STUDENT" | "TEACHER";

/** Usuário logado, como o jogo e o painel o recebem. Nunca inclui a senha. */
export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  xp: number;
  level: number;
  /** null = ainda não escolheu o visual (o jogo pede na primeira entrada). */
  avatar: Avatar | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}
