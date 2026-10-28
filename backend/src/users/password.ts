import { compare, hash, hashSync } from 'bcryptjs';

const COST = 10;

/**
 * Hash de uma senha qualquer, usado quando o login não existe. Assim a resposta
 * demora o mesmo tanto com ou sem usuário, e não dá para descobrir quais logins
 * existem medindo o tempo de resposta.
 */
const DUMMY_HASH = hashSync('senha-ficticia-para-tempo-constante', COST);

export function hashPassword(password: string): Promise<string> {
  return hash(password, COST);
}

export function verifyPassword(password: string, passwordHash: string | undefined): Promise<boolean> {
  return compare(password, passwordHash ?? DUMMY_HASH);
}
