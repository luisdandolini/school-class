import type { FastifyInstance } from "fastify";
import { HAIR_COLORS, HAIR_STYLES, SHIRT_COLORS, SKIN_TONES, type AuthUser } from "@school-class/shared";
import { z } from "zod";
import { prisma } from "../../db.js";
import { env } from "../../env.js";
import { hub } from "../realtime/hub.js";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "../../plugins/auth.js";
import { toAuthUser } from "./auth.service.js";
import { DUMMY_HASH, verifyPassword } from "./password.js";

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(50),
  password: z.string().min(1).max(200),
});

const index = (n: number) => z.number().int().min(0).max(n - 1);
const avatarSchema = z.object({
  style: index(HAIR_STYLES.length),
  skin: index(SKIN_TONES.length),
  hair: index(HAIR_COLORS.length),
  shirt: index(SHIRT_COLORS.length),
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

  /** Escolhe ou troca o visual do personagem. Os colegas online veem a mudança na hora. */
  app.put(
    "/auth/me/avatar",
    { preHandler: app.authenticate, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request): Promise<AuthUser> => {
      const avatar = avatarSchema.parse(request.body);
      const user = await prisma.user.update({ where: { id: request.user.sub }, data: { avatar } });
      hub.avatarChanged(user.id, avatar);
      return toAuthUser(user);
    },
  );
}
