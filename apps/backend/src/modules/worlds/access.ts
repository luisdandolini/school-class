import type { Role } from "@school-class/shared";
import type { Prisma } from "../../generated/prisma/client.js";

/** Professor acessa os mundos que criou; aluno, os mundos em que está matriculado. */
export function accessibleWorlds(user: { sub: string; role: Role }): Prisma.WorldWhereInput {
  return user.role === "TEACHER"
    ? { ownerId: user.sub }
    : { enrollments: { some: { userId: user.sub } } };
}
