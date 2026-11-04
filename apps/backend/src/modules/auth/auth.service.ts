import { levelFromXp, type AuthUser } from "@school-class/shared";
import type { User } from "../../generated/prisma/client.js";

/** Converte o usuário do banco para o formato público (sem senha). */
export function toAuthUser(user: Pick<User, "id" | "name" | "username" | "role" | "xp">): AuthUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    xp: user.xp,
    level: levelFromXp(user.xp),
  };
}
