import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { Role } from "@school-class/shared";
import { env } from "../env.js";

export const SESSION_COOKIE = "session";
/** Duração da sessão: 7 dias. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** O que vai dentro do token: só o id e o papel. Nome/XP são lidos do banco. */
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: Role };
    user: { sub: string; role: Role };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** preHandler: exige usuário logado. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** preHandler: exige usuário logado com um dos papéis. */
    requireRole: (...roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app) => {
  await app.register(cookie);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
    sign: { expiresIn: SESSION_MAX_AGE },
  });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Não autenticado" });
    }
  });

  app.decorate("requireRole", (...roles: Role[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: "Não autenticado" });
      }
      if (!roles.includes(request.user.role)) {
        return reply.code(403).send({ error: "Sem permissão" });
      }
    };
  });
});
