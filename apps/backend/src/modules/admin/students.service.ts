import { levelFromXp, parseAvatar, type AdminStudent, type StudentCredentials } from "@school-class/shared";
import { prisma } from "../../db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/http-error.js";
import { hashPassword } from "../auth/password.js";
import { firstFreeUsername, generatePassword, usernameFromName } from "./credentials.js";

/**
 * Alunos que um professor pode ver e gerenciar:
 * os que ele cadastrou + os matriculados em algum mundo dele.
 */
export function visibleStudents(teacherId: string): Prisma.UserWhereInput {
  return {
    role: "STUDENT",
    OR: [{ createdById: teacherId }, { enrollments: { some: { world: { ownerId: teacherId } } } }],
  };
}

const studentInclude = (teacherId: string) =>
  ({
    enrollments: {
      where: { world: { ownerId: teacherId } },
      select: { world: { select: { id: true, name: true } } },
      orderBy: { world: { name: "asc" } },
    },
  }) satisfies Prisma.UserInclude;

type StudentRow = Prisma.UserGetPayload<{ include: ReturnType<typeof studentInclude> }>;

function toAdminStudent(u: StudentRow, teacherId: string): AdminStudent {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    xp: u.xp,
    level: levelFromXp(u.xp),
    avatar: parseAvatar(u.avatar),
    createdAt: u.createdAt.toISOString(),
    worlds: u.enrollments.map((e) => e.world),
    createdByMe: u.createdById === teacherId,
  };
}

export async function listStudents(teacherId: string, worldId?: string): Promise<AdminStudent[]> {
  const where: Prisma.UserWhereInput = worldId
    ? { role: "STUDENT", enrollments: { some: { worldId, world: { ownerId: teacherId } } } }
    : visibleStudents(teacherId);
  const rows = await prisma.user.findMany({
    where,
    include: studentInclude(teacherId),
    orderBy: { name: "asc" },
  });
  return rows.map((u) => toAdminStudent(u, teacherId));
}

/** Busca um aluno visível para o professor, ou 404. */
async function findStudent(teacherId: string, studentId: string) {
  const student = await prisma.user.findFirst({ where: { id: studentId, ...visibleStudents(teacherId) } });
  if (!student) throw new HttpError(404, "Aluno não encontrado");
  return student;
}

/** Garante que todos os mundos pertencem ao professor. */
async function assertOwnWorlds(teacherId: string, worldIds: string[]) {
  if (worldIds.length === 0) return;
  const count = await prisma.world.count({ where: { id: { in: worldIds }, ownerId: teacherId } });
  if (count !== new Set(worldIds).size) throw new HttpError(404, "Mundo não encontrado");
}

/** Usuários já usados que começam com `base` (para escolher o próximo livre). */
async function takenUsernames(bases: string[]): Promise<Set<string>> {
  const rows = await prisma.user.findMany({
    where: { OR: [...new Set(bases)].map((b) => ({ username: { startsWith: b } })) },
    select: { username: true },
  });
  return new Set(rows.map((r) => r.username));
}

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function createStudent(
  teacherId: string,
  input: { name: string; username?: string; password?: string; worldIds?: string[] },
): Promise<StudentCredentials> {
  const worldIds = input.worldIds ?? [];
  await assertOwnWorlds(teacherId, worldIds);

  let username = input.username;
  if (!username) {
    const base = usernameFromName(input.name);
    username = firstFreeUsername(base, await takenUsernames([base]));
  }
  const password = input.password || generatePassword();

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        username,
        passwordHash: await hashPassword(password),
        role: "STUDENT",
        createdById: teacherId,
        enrollments: { create: worldIds.map((worldId) => ({ worldId })) },
      },
    });
    return { id: user.id, name: user.name, username: user.username, password };
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, `O usuário "${username}" já existe. Escolha outro.`);
    throw err;
  }
}

/** Cadastra uma turma inteira de uma vez, gerando usuários e senhas. */
export async function createStudentsBulk(
  teacherId: string,
  names: string[],
  worldId?: string,
): Promise<StudentCredentials[]> {
  if (worldId) await assertOwnWorlds(teacherId, [worldId]);

  const bases = names.map(usernameFromName);
  const taken = await takenUsernames(bases);
  const prepared = await Promise.all(
    names.map(async (name, i) => {
      const username = firstFreeUsername(bases[i], taken);
      taken.add(username); // evita repetir dentro da mesma lista
      const password = generatePassword();
      return { name, username, password, passwordHash: await hashPassword(password) };
    }),
  );

  try {
    // Tudo ou nada: se um falhar, ninguém é criado.
    return await prisma.$transaction(async (tx) => {
      const out: StudentCredentials[] = [];
      for (const s of prepared) {
        const user = await tx.user.create({
          data: {
            name: s.name,
            username: s.username,
            passwordHash: s.passwordHash,
            role: "STUDENT",
            createdById: teacherId,
            enrollments: worldId ? { create: { worldId } } : undefined,
          },
        });
        out.push({ id: user.id, name: s.name, username: s.username, password: s.password });
      }
      return out;
    });
  } catch (err) {
    // Raro: alguém criou o mesmo usuário ao mesmo tempo. Basta tentar de novo.
    if (isUniqueViolation(err)) throw new HttpError(409, "Conflito de usuários. Tente novamente.");
    throw err;
  }
}

export async function updateStudent(
  teacherId: string,
  studentId: string,
  input: { name?: string; username?: string },
): Promise<AdminStudent> {
  await findStudent(teacherId, studentId);
  try {
    const u = await prisma.user.update({
      where: { id: studentId },
      data: input,
      include: studentInclude(teacherId),
    });
    return toAdminStudent(u, teacherId);
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, `O usuário "${input.username}" já existe. Escolha outro.`);
    throw err;
  }
}

export async function resetPassword(teacherId: string, studentId: string, password?: string) {
  const student = await findStudent(teacherId, studentId);
  const newPassword = password || generatePassword();
  await prisma.user.update({ where: { id: studentId }, data: { passwordHash: await hashPassword(newPassword) } });
  const creds: StudentCredentials = {
    id: student.id,
    name: student.name,
    username: student.username,
    password: newPassword,
  };
  return creds;
}

export async function deleteStudent(teacherId: string, studentId: string) {
  const student = await findStudent(teacherId, studentId);
  if (student.createdById !== teacherId) {
    throw new HttpError(403, "Só o professor que cadastrou este aluno pode excluí-lo. Você pode removê-lo do seu mundo.");
  }
  await prisma.user.delete({ where: { id: studentId } });
}
