import type { FastifyInstance } from "fastify";
import { FEEDBACK_MAX_LENGTH } from "@school-class/shared";
import { z } from "zod";
import { worldReport, studentProgress } from "./reports.service.js";
import { countPendingReviews, listPendingReviews, reviewSubmission } from "./reviews.service.js";

const id = z.string().min(1);

/** Correção de respostas abertas e relatórios. (Herdam a exigência de professor.) */
export async function reviewRoutes(app: FastifyInstance) {
  app.get("/admin/reviews", async (request) => {
    const { worldId } = z.object({ worldId: id.optional() }).parse(request.query);
    return listPendingReviews(request.user.sub, worldId);
  });

  app.get("/admin/reviews/count", async (request) => ({ pending: await countPendingReviews(request.user.sub) }));

  app.post("/admin/reviews/:submissionId", async (request) => {
    const { submissionId } = z.object({ submissionId: id }).parse(request.params);
    const body = z
      .object({
        correct: z.boolean({ message: "Informe se a resposta está correta" }),
        feedback: z.string().max(FEEDBACK_MAX_LENGTH, "Comentário muito longo").optional(),
      })
      .parse(request.body);
    return reviewSubmission(request.user.sub, submissionId, body.correct, body.feedback);
  });

  app.get("/admin/worlds/:worldId/report", async (request) => {
    const { worldId } = z.object({ worldId: id }).parse(request.params);
    return worldReport(request.user.sub, worldId);
  });

  app.get("/admin/worlds/:worldId/students/:studentId/progress", async (request) => {
    const { worldId, studentId } = z.object({ worldId: id, studentId: id }).parse(request.params);
    return studentProgress(request.user.sub, worldId, studentId);
  });
}
