import type { AdminWorld } from "@school-class/shared";
import { prisma } from "../../db.js";
import { HttpError } from "../../lib/http-error.js";
import { visibleStudents } from "./students.service.js";

export async function listOwnWorlds(teacherId: string): Promise<AdminWorld[]> {
  const worlds = await prisma.world.findMany({
    where: { ownerId: teacherId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { enrollments: true, npcs: true } },
      npcs: { select: { _count: { select: { tasks: true } } } },
    },
  });
  return worlds.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    mapKey: w.mapKey,
    studentCount: w._count.enrollments,
    npcCount: w._count.npcs,
    taskCount: w.npcs.reduce((sum, n) => sum + n._count.tasks, 0),
  }));
}

async function assertOwnWorld(teacherId: string, worldId: string) {
  const world = await prisma.world.findFirst({ where: { id: worldId, ownerId: teacherId } });
  if (!world) throw new HttpError(404, "Mundo não encontrado");
}

/** Matricula alunos num mundo do professor (ignora quem já está matriculado). */
export async function enrollStudents(teacherId: string, worldId: string, studentIds: string[]) {
  await assertOwnWorld(teacherId, worldId);
  const allowed = await prisma.user.findMany({
    where: { id: { in: studentIds }, ...visibleStudents(teacherId) },
    select: { id: true },
  });
  if (allowed.length !== new Set(studentIds).size) throw new HttpError(404, "Aluno não encontrado");
  await prisma.enrollment.createMany({
    data: allowed.map((s) => ({ userId: s.id, worldId })),
    skipDuplicates: true,
  });
}

export async function unenrollStudent(teacherId: string, worldId: string, studentId: string) {
  await assertOwnWorld(teacherId, worldId);
  await prisma.enrollment.deleteMany({ where: { worldId, userId: studentId } });
}
