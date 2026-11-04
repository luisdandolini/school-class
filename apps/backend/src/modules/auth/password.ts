import bcrypt from "bcryptjs";

const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash "falso" usado quando o usuário não existe, para o login levar o mesmo
 * tempo nos dois casos (evita descobrir quais usernames existem pelo tempo de resposta).
 */
export const DUMMY_HASH = bcrypt.hashSync("senha-que-nao-existe", ROUNDS);
