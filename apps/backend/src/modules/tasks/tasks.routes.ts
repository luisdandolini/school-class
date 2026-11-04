import type { FastifyInstance } from "fastify";
import type { NpcTask, TaskResult } from "@school-class/shared";
import { z } from "zod";
import { listNpcTasks, NotFoundError, submitAnswer } from "./tasks.service.js";

const idParams = z.object({ id: z.string().min(1) });
const answerBody = z.object({ answer: z.string().max(2000) });

export async function taskRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof NotFoundError) return reply.code(404).send({ error: error.message });
    throw error; // demais erros seguem para o tratador global
  });

  // Tarefas do NPC (sem as respostas certas) + situação do aluno em cada uma.
  app.get("/npcs/:id/tasks", async (request): Promise<NpcTask[]> => {
    const { id } = idParams.parse(request.params);
    return listNpcTasks(request.user, id);
  });

  app.post(
    "/tasks/:id/submit",
    // Evita "chutar" respostas em massa.
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request): Promise<TaskResult> => {
      const { id } = idParams.parse(request.params);
      const { answer } = answerBody.parse(request.body);
      return submitAnswer(request.user, id, answer);
    },
  );
}
