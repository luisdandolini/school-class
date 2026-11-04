export type Role = "STUDENT" | "TEACHER";

/** Usuário logado, como o jogo e o painel o recebem. Nunca inclui a senha. */
export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  xp: number;
  level: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}
