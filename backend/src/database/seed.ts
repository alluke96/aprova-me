import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../users/password';

/**
 * Cria o usuário padrão do enunciado (aprovame/aprovame). Idempotente: rodar de
 * novo não duplica nem troca a senha de quem já existe.
 */
async function seed(): Promise<void> {
  const prisma = new PrismaClient();
  const login = (process.env.SEED_USER_LOGIN ?? 'aprovame').toLowerCase();
  const password = process.env.SEED_USER_PASSWORD ?? 'aprovame';

  try {
    await prisma.user.upsert({
      where: { login },
      create: { login, passwordHash: await hashPassword(password) },
      update: {},
    });
    console.log(`Seed concluído: usuário "${login}" disponível.`);
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error('Falha no seed', error);
  process.exit(1);
});
