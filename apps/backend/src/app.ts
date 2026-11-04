import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { worldRoutes } from "./modules/worlds/worlds.routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true, trustProxy: true });

  await app.register(cors, { origin: true, credentials: true });
  // global: false → só limita as rotas que pedem (ex.: login).
  await app.register(rateLimit, { global: false });
  await app.register(authPlugin);

  // Erros de validação viram 400 com uma mensagem amigável.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "Dados inválidos", issues: error.issues });
    }
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      return reply.code(status).send({ error: (error as Error).message });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "Erro interno" });
  });

  // Todas as rotas da API ficam sob /api (o Nginx encaminha /api para cá).
  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
      await api.register(worldRoutes);
    },
    { prefix: "/api" },
  );

  return app;
}
