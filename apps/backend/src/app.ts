import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./modules/health/health.routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  // Todas as rotas da API ficam sob /api (o Nginx encaminha /api para cá).
  await app.register(
    async (api) => {
      await api.register(healthRoutes);
    },
    { prefix: "/api" },
  );

  return app;
}
