import { ServiceUnavailableException } from '@nestjs/common';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('responde ok quando o banco responde', async () => {
    const prisma = createPrismaMock();
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(new HealthController(prisma).check()).resolves.toEqual({ status: 'ok' });
  });

  it('responde 503 quando o banco está fora', async () => {
    const prisma = createPrismaMock();
    prisma.$queryRaw.mockRejectedValue(new Error('down'));

    await expect(new HealthController(prisma).check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
