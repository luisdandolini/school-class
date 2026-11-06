import { levelFromXp, parseAvatar, type AuthUser } from "@school-class/shared";
import type { User } from "../../generated/prisma/client.js";

/** Converte o usuário do banco para o formato público (sem senha). */
export function toAuthUser(user: Pick<User, "id" | "name" | "username" | "role" | "xp" | "avatar">): AuthUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    xp: user.xp,
    level: levelFromXp(user.xp),
    avatar: parseAvatar(user.avatar),
  };
}
