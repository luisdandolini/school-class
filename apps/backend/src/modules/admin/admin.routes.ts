import type { FastifyInstance } from "fastify";
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_PATTERN,
  type AdminStudent,
  type AdminWorld,
  type StudentCredentials,
} from "@school-class/shared";
import { z } from "zod";
import {
  createStudent,
  createStudentsBulk,
  deleteStudent,
  listStudents,
  resetPassword,
  updateStudent,
} from "./students.service.js";
import { contentRoutes } from "./content.routes.js";
import { reviewRoutes } from "./reviews.routes.js";
import { enrollStudents, listOwnWorlds, unenrollStudent } from "./worlds.service.js";

const name = z.string().trim().min(1, "Informe o nome").max(80, "Nome muito longo");
const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, "Usuário deve ter 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou _");
const password = z.string().min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`).max(100);
/** Campo opcional: string vazia conta como "não informado". */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

const id = z.string().min(1);
const params = { student: z.object({ id }), world: z.object({ worldId: id }), enrollment: z.object({ worldId: id, studentId: id }) };

/** Rotas do painel do professor. Todas exigem login de professor. */
export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireRole("TEACHER"));
  await app.register(contentRoutes); // mundos, NPCs e tarefas
  await app.register(reviewRoutes); // correções e relatórios

  // ---------- alunos ----------
  app.get("/admin/students", async (request): Promise<AdminStudent[]> => {
    const { worldId } = z.object({ worldId: id.optional() }).parse(request.query);
    return listStudents(request.user.sub, worldId);
  });

  app.post("/admin/students", async (request, reply): Promise<StudentCredentials> => {
    const body = z
      .object({ name, username: optional(username), password: optional(password), worldIds: z.array(id).max(50).optional() })
      .parse(request.body);
    reply.code(201);
    return createStudent(request.user.sub, body);
  });

  app.post("/admin/students/bulk", async (request, reply): Promise<StudentCredentials[]> => {
    const body = z
      .object({
        names: z.array(name).min(1, "Informe pelo menos um nome").max(60, "No máximo 60 alunos por vez"),
        worldId: id.optional(),
      })
      .parse(request.body);
    reply.code(201);
    return createStudentsBulk(request.user.sub, body.names, body.worldId);
  });

  app.patch("/admin/students/:id", async (request): Promise<AdminStudent> => {
    const { id: studentId } = params.student.parse(request.params);
    const body = z.object({ name: name.optional(), username: username.optional() }).parse(request.body);
    return updateStudent(request.user.sub, studentId, body);
  });

  app.post("/admin/students/:id/reset-password", async (request): Promise<StudentCredentials> => {
    const { id: studentId } = params.student.parse(request.params);
    const body = z.object({ password: optional(password) }).parse(request.body ?? {});
    return resetPassword(request.user.sub, studentId, body.password);
  });

  app.delete("/admin/students/:id", async (request, reply) => {
    const { id: studentId } = params.student.parse(request.params);
    await deleteStudent(request.user.sub, studentId);
    return reply.code(204).send();
  });

  // ---------- mundos e matrículas ----------
  app.get("/admin/worlds", async (request): Promise<AdminWorld[]> => listOwnWorlds(request.user.sub));

  app.post("/admin/worlds/:worldId/students", async (request, reply) => {
    const { worldId } = params.world.parse(request.params);
    const { studentIds } = z.object({ studentIds: z.array(id).min(1).max(200) }).parse(request.body);
    await enrollStudents(request.user.sub, worldId, studentIds);
    return reply.code(204).send();
  });

  app.delete("/admin/worlds/:worldId/students/:studentId", async (request, reply) => {
    const { worldId, studentId } = params.enrollment.parse(request.params);
    await unenrollStudent(request.user.sub, worldId, studentId);
    return reply.code(204).send();
  });
}
