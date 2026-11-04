import type { FastifyInstance } from "fastify";
import type { AuthUser } from "@school-class/shared";
import { z } from "zod";
import { prisma } from "../../db.js";
import { env } from "../../env.js";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "../../plugins/auth.js";
import { toAuthUser } from "./auth.service.js";
import { DUMMY_HASH, verifyPassword } from "./password.js";

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(50),
  password: z.string().min(1).max(200),
});

const cookieOptions = {
  path: "/",
  httpOnly: true, // o JavaScript da página não consegue ler o token
  sameSite: "lax" as const,
  secure: env.COOKIE_SECURE,
};

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/auth/login",
    // No máximo 10 tentativas por minuto por IP.
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply): Promise<AuthUser> => {
      const { username, password } = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({ where: { username } });
      const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !ok) {
        return reply.code(401).send({ error: "Usuário ou senha incorretos" });
      }

      const token = await reply.jwtSign({ sub: user.id, role: user.role });
      reply.setCookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE });
      return toAuthUser(user);
    },
  );

  app.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE, cookieOptions);
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: app.authenticate }, async (request, reply): Promise<AuthUser> => {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    // Usuário apagado depois do login: derruba a sessão.
    if (!user) {
      reply.clearCookie(SESSION_COOKIE, cookieOptions);
      return reply.code(401).send({ error: "Não autenticado" });
    }
    return toAuthUser(user);
  });
}
