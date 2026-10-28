import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Env } from '../config/env';
import { PayablesService } from '../payables/payables.service';
import { BatchCompletedJob } from '../queues/queues.constants';
import { payableInput } from '../test-utils/fixtures';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { BatchProgressService } from './batch-progress.service';

const BATCH_ID = 'c0ffee00-0000-4000-8000-000000000001';

describe('BatchProgressService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let payables: { createIdempotent: jest.Mock };
  let notifications: { add: jest.Mock };
  let service: BatchProgressService;
  const config = {
    get: (key: string) => ({ BATCH_MAX_ATTEMPTS: 5, BATCH_BACKOFF_MS: 1000 })[key],
  } as unknown as ConfigService<Env, true>;

  beforeEach(() => {
    prisma = createPrismaMock();
    payables = { createIdempotent: jest.fn().mockResolvedValue({ created: true }) };
    notifications = { add: jest.fn() };
    service = new BatchProgressService(
      prisma,
      payables as unknown as PayablesService,
      config,
      notifications as unknown as Queue<BatchCompletedJob>,
    );
  });

  describe('processItem', () => {
    it('cria o recebível e conta o sucesso na mesma transação', async () => {
      prisma.batchItem.createMany.mockResolvedValue({ count: 1 });

      await service.processItem(BATCH_ID, payableInput, 1);

      expect(payables.createIdempotent).toHaveBeenCalledWith(payableInput, prisma);
      expect(prisma.batchItem.createMany).toHaveBeenCalledWith({
        data: [{ batchId: BATCH_ID, payableId: payableInput.id, status: 'SUCCEEDED', attempts: 1 }],
        skipDuplicates: true,
      });
      expect(prisma.batch.update).toHaveBeenCalledWith({
        where: { id: BATCH_ID },
        data: { succeeded: { increment: 1 } },
      });
    });

    it('não conta duas vezes um item reprocessado', async () => {
      prisma.batchItem.createMany.mockResolvedValue({ count: 0 });

      await service.processItem(BATCH_ID, payableInput, 2);

      expect(prisma.batch.update).not.toHaveBeenCalled();
    });

    it('propaga o erro para o worker decidir se tenta de novo', async () => {
      payables.createIdempotent.mockRejectedValue(new Error('db down'));

      await expect(service.processItem(BATCH_ID, payableInput, 1)).rejects.toThrow('db down');
      expect(prisma.batch.update).not.toHaveBeenCalled();
    });
  });

  describe('recordFailure', () => {
    it('registra a falha e conta uma única vez', async () => {
      prisma.batchItem.createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({
        count: 0,
      });

      await service.recordFailure(BATCH_ID, payableInput.id, 5, 'erro');
      await service.recordFailure(BATCH_ID, payableInput.id, 5, 'erro');

      expect(prisma.batch.update).toHaveBeenCalledTimes(1);
      expect(prisma.batch.update).toHaveBeenCalledWith({
        where: { id: BATCH_ID },
        data: { failed: { increment: 1 } },
      });
    });

    it('corta mensagens de erro muito longas', async () => {
      prisma.batchItem.createMany.mockResolvedValue({ count: 1 });

      await service.recordFailure(BATCH_ID, payableInput.id, 5, 'x'.repeat(5_000));

      expect(prisma.batchItem.createMany.mock.calls[0][0].data[0].error).toHaveLength(1_000);
    });
  });

  describe('completeIfDone', () => {
    it('fecha o lote e agenda o e-mail quando todos os itens terminaram', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: BATCH_ID }]);

      await expect(service.completeIfDone(BATCH_ID)).resolves.toBe(true);
      expect(notifications.add).toHaveBeenCalledWith(
        'batch-completed',
        { batchId: BATCH_ID },
        expect.objectContaining({ jobId: `batch-completed-${BATCH_ID}`, attempts: 5 }),
      );
    });

    it('não faz nada enquanto ainda há itens pendentes', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(service.completeIfDone(BATCH_ID)).resolves.toBe(false);
      expect(notifications.add).not.toHaveBeenCalled();
    });
  });
});
