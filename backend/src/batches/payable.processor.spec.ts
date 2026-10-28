import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { Env } from '../config/env';
import { AssignorNotFoundError } from '../payables/payable.errors';
import { CreatePayableJob, DeadPayableJob } from '../queues/queues.constants';
import { payableInput } from '../test-utils/fixtures';
import { BatchProgressService } from './batch-progress.service';
import { PayableProcessor } from './payable.processor';

const BATCH_ID = 'c0ffee00-0000-4000-8000-000000000001';

function job(attemptsMade: number, attempts = 5): Job<CreatePayableJob> {
  return {
    data: { batchId: BATCH_ID, payable: payableInput },
    attemptsMade,
    opts: { attempts },
  } as unknown as Job<CreatePayableJob>;
}

describe('PayableProcessor', () => {
  let progress: {
    processItem: jest.Mock;
    recordFailure: jest.Mock;
    completeIfDone: jest.Mock;
  };
  let deadLetter: { add: jest.Mock };
  let processor: PayableProcessor;
  const config = {
    get: (key: string) => ({ BATCH_BACKOFF_MS: 1000, BATCH_CONCURRENCY: 10 })[key],
  } as unknown as ConfigService<Env, true>;

  beforeEach(() => {
    progress = {
      processItem: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      completeIfDone: jest.fn().mockResolvedValue(false),
    };
    deadLetter = { add: jest.fn().mockResolvedValue({}) };
    processor = new PayableProcessor(
      progress as unknown as BatchProgressService,
      config,
      deadLetter as unknown as Queue<DeadPayableJob>,
    );
  });

  it('processa o item e verifica se o lote terminou', async () => {
    await expect(processor.process(job(0))).resolves.toBe('succeeded');

    expect(progress.processItem).toHaveBeenCalledWith(BATCH_ID, payableInput, 1);
    expect(progress.completeIfDone).toHaveBeenCalledWith(BATCH_ID);
  });

  it('relança erro temporário para o BullMQ tentar de novo', async () => {
    progress.processItem.mockRejectedValue(new Error('db down'));

    await expect(processor.process(job(2))).rejects.toThrow('db down');
    expect(deadLetter.add).not.toHaveBeenCalled();
    expect(progress.completeIfDone).not.toHaveBeenCalled();
  });

  it('manda para a fila morta na quinta tentativa (1 + 4 retentativas)', async () => {
    progress.processItem.mockRejectedValue(new Error('db down'));

    await expect(processor.process(job(4))).resolves.toBe('dead-lettered');

    expect(deadLetter.add).toHaveBeenCalledWith(
      'dead-payable',
      expect.objectContaining({ batchId: BATCH_ID, error: 'db down', attempts: 5 }),
      expect.objectContaining({ removeOnComplete: false, removeOnFail: false }),
    );
    expect(progress.recordFailure).toHaveBeenCalledWith(BATCH_ID, payableInput.id, 5, 'db down');
    expect(progress.completeIfDone).toHaveBeenCalledWith(BATCH_ID);
  });

  it('manda erro permanente direto para a fila morta, sem retentar', async () => {
    progress.processItem.mockRejectedValue(new AssignorNotFoundError(payableInput.assignor));

    await expect(processor.process(job(0))).resolves.toBe('dead-lettered');
    expect(progress.recordFailure).toHaveBeenCalledWith(
      BATCH_ID,
      payableInput.id,
      1,
      expect.stringContaining('não encontrado'),
    );
  });
});
