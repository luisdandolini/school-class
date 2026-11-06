import type { FastifyInstance } from "fastify";
import type { EarnedAchievement } from "@school-class/shared";
import { z } from "zod";
import { awardAchievementsSafely, listAchievements, markSeen } from "./achievements.service.js";

const seenSchema = z.object({ keys: z.array(z.string().min(1).max(100)).min(1).max(50) });

/** Conquistas do usuário logado. */
export async function achievementsRoutes(app: FastifyInstance) {
  app.get("/achievements", { preHandler: app.authenticate }, async (request): Promise<EarnedAchievement[]> => {
    // Concede o que o histórico já garante (as novas aparecem como "não vistas" e o jogo comemora).
    await awardAchievementsSafely(request.user.sub, { kind: "sync" });
    return listAchievements(request.user.sub);
  });

  /** O jogo avisa que mostrou a comemoração (para não repetir no próximo login). */
  app.post("/achievements/seen", { preHandler: app.authenticate }, async (request) => {
    await markSeen(request.user.sub, seenSchema.parse(request.body).keys);
    return { ok: true };
  });
}
