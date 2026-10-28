import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Env } from '../config/env';
import { CreatePayableJob } from '../queues/queues.constants';
import { payableInput } from '../test-utils/fixtures';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { BatchesService } from './batches.service';

const BATCH_ID = 'c0ffee00-0000-4000-8000-000000000001';

function makeBatch(overrides = {}) {
  return {
    id: BATCH_ID,
    total: 2,
    succeeded: 0,
    failed: 0,
    status: 'PROCESSING' as const,
    createdAt: new Date('2026-10-28T12:00:00.000Z'),
    finishedAt: null,
    ...overrides,
  };
}

function payables(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...payableInput,
    id: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
  }));
}

describe('BatchesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let queue: { addBulk: jest.Mock };
  let service: BatchesService;
  const config = {
    get: (key: string) => ({ BATCH_MAX_ATTEMPTS: 5, BATCH_BACKOFF_MS: 1000 })[key],
  } as unknown as ConfigService<Env, true>;

  beforeEach(() => {
    prisma = createPrismaMock();
    queue = { addBulk: jest.fn().mockResolvedValue([]) };
    service = new BatchesService(prisma, config, queue as unknown as Queue<CreatePayableJob>);
  });

  it('registra o lote e publica um job por recebível com retentativa', async () => {
    prisma.batch.create.mockResolvedValue(makeBatch());

    const result = await service.create({ payables: payables(2) });

    expect(result).toMatchObject({ id: BATCH_ID, status: 'PROCESSING', total: 2, pending: 2 });
    const [jobs] = queue.addBulk.mock.calls[0];
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      name: 'create-payable',
      data: { batchId: BATCH_ID, payable: { id: payables(1)[0].id } },
      opts: {
        jobId: `${BATCH_ID}-${payables(1)[0].id}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
    });
  });

  it('publica em blocos de 1.000 para não montar um comando gigante no Redis', async () => {
    prisma.batch.create.mockResolvedValue(makeBatch({ total: 2_500 }));

    await service.create({ payables: payables(2_500) });

    expect(queue.addBulk.mock.calls.map(([jobs]) => jobs.length)).toEqual([1_000, 1_000, 500]);
  });

  it('recusa ids repetidos dentro do lote', async () => {
    const [item] = payables(1);

    await expect(service.create({ payables: [item, item] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.batch.create).not.toHaveBeenCalled();
  });

  it('desfaz o lote se a fila estiver fora', async () => {
    prisma.batch.create.mockResolvedValue(makeBatch());
    queue.addBulk.mockRejectedValue(new Error('redis down'));

    await expect(service.create({ payables: payables(2) })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.batch.delete).toHaveBeenCalledWith({ where: { id: BATCH_ID } });
  });

  it('mostra progresso e falhas do lote', async () => {
    prisma.batch.findUnique.mockResolvedValue({
      ...makeBatch({ succeeded: 1, failed: 1, status: 'COMPLETED' }),
      items: [{ payableId: 'p1', attempts: 5, error: 'boom' }],
    });

    const result = await service.findOne(BATCH_ID);

    expect(result).toMatchObject({
      pending: 0,
      status: 'COMPLETED',
      failures: [{ payableId: 'p1', attempts: 5, error: 'boom' }],
    });
  });

  it('retorna 404 para lote inexistente', async () => {
    prisma.batch.findUnique.mockResolvedValue(null);

    await expect(service.findOne(BATCH_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
