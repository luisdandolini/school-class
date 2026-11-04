import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(16, "JWT_SECRET precisa ter pelo menos 16 caracteres"),
  /** true quando o site roda em HTTPS (o cookie de sessão só trafega por HTTPS). */
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = schema.parse(process.env);
