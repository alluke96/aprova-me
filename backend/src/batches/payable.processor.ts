import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { Env } from '../config/env';
import { isPermanentPayableError } from '../payables/payable.errors';
import {
  CreatePayableJob,
  DEAD_LETTER_QUEUE,
  DeadPayableJob,
  JOBS,
  jobIds,
  PAYABLES_QUEUE,
} from '../queues/queues.constants';
import { BatchProgressService } from './batch-progress.service';

export type ItemOutcome = 'succeeded' | 'retrying' | 'dead-lettered';

/**
 * Consome a fila de lotes, um recebível por job (nível 7), com retentativa e
 * fila morta (nível 8):
 *
 * - erro temporário (banco fora, timeout): relança, e o BullMQ tenta de novo com
 *   backoff exponencial até `BATCH_MAX_ATTEMPTS` (1 + 4 retentativas);
 * - erro permanente (cedente inexistente, id em conflito): tentar de novo não
 *   adianta, então o item vai direto para a fila morta;
 * - na última tentativa, o item vai para a fila morta, que avisa operações.
 */
@Processor(PAYABLES_QUEUE)
export class PayableProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(PayableProcessor.name);

  constructor(
    private readonly progress: BatchProgressService,
    private readonly config: ConfigService<Env, true>,
    @InjectQueue(DEAD_LETTER_QUEUE) private readonly deadLetter: Queue<DeadPayableJob>,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    this.worker.concurrency = this.config.get('BATCH_CONCURRENCY', { infer: true });
  }

  async process(job: Job<CreatePayableJob>): Promise<ItemOutcome> {
    const { batchId, payable } = job.data;
    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts ?? 1;
    let outcome: ItemOutcome;

    try {
      await this.progress.processItem(batchId, payable, attempt);
      outcome = 'succeeded';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const permanent = isPermanentPayableError(error);

      if (!permanent && attempt < maxAttempts) {
        this.logger.warn(
          `Recebível ${payable.id} falhou (tentativa ${attempt}/${maxAttempts}): ${message}`,
        );
        throw error;
      }

      await this.deadLetter.add(
        JOBS.deadPayable,
        { batchId, payable, error: message, attempts: attempt, failedAt: new Date().toISOString() },
        {
          jobId: jobIds.payable(batchId, payable.id),
          attempts: maxAttempts,
          backoff: { type: 'exponential', delay: this.config.get('BATCH_BACKOFF_MS', { infer: true }) },
          // A fila morta guarda os itens para análise e reprocessamento manual.
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
      await this.progress.recordFailure(batchId, payable.id, attempt, message);
      this.logger.error(`Recebível ${payable.id} enviado para a fila morta: ${message}`);
      outcome = 'dead-lettered';
    }

    await this.progress.completeIfDone(batchId);
    return outcome;
  }
}
