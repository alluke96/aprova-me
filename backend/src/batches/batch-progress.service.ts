import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Env } from '../config/env';
import { PayableDto } from '../payables/dto/payable.dto';
import { PayablesService } from '../payables/payables.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BatchCompletedJob,
  JOBS,
  jobIds,
  NOTIFICATIONS_QUEUE,
} from '../queues/queues.constants';

const MAX_ERROR_LENGTH = 1_000;

/**
 * Registra o resultado de cada item e fecha o lote. A ideia central é contar
 * cada item exatamente uma vez, mesmo que o job rode de novo depois de um crash:
 * o resultado vai para `batch_items` (chave lote + recebível) com
 * `ON CONFLICT DO NOTHING`, e o contador só sobe se a linha foi inserida agora.
 */
@Injectable()
export class BatchProgressService {
  private readonly logger = new Logger(BatchProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payables: PayablesService,
    private readonly config: ConfigService<Env, true>,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notifications: Queue<BatchCompletedJob>,
  ) {}

  /** Cria o recebível e marca o item como sucesso, na mesma transação. */
  async processItem(batchId: string, payable: PayableDto, attempts: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.payables.createIdempotent(payable, tx);
      const { count } = await tx.batchItem.createMany({
        data: [{ batchId, payableId: payable.id, status: 'SUCCEEDED', attempts }],
        skipDuplicates: true,
      });
      if (count === 1) {
        await tx.batch.update({ where: { id: batchId }, data: { succeeded: { increment: 1 } } });
      }
    });
  }

  async recordFailure(
    batchId: string,
    payableId: string,
    attempts: number,
    error: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.batchItem.createMany({
        data: [
          {
            batchId,
            payableId,
            status: 'FAILED',
            attempts,
            error: error.slice(0, MAX_ERROR_LENGTH),
          },
        ],
        skipDuplicates: true,
      });
      if (count === 1) {
        await tx.batch.update({ where: { id: batchId }, data: { failed: { increment: 1 } } });
      }
    });
  }

  /**
   * Fecha o lote quando todos os itens tiveram resultado. O UPDATE condicional é
   * atômico: se dois workers terminarem juntos, só um vê a linha e dispara o e-mail.
   */
  async completeIfDone(batchId: string): Promise<boolean> {
    const closed = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE "batches"
         SET "status" = 'COMPLETED', "finished_at" = NOW()
       WHERE "id" = ${batchId}::uuid
         AND "status" = 'PROCESSING'
         AND "succeeded" + "failed" >= "total"
      RETURNING "id"`;

    if (closed.length === 0) return false;

    await this.notifications.add(
      JOBS.batchCompleted,
      { batchId },
      {
        jobId: jobIds.batchCompleted(batchId),
        attempts: this.config.get('BATCH_MAX_ATTEMPTS', { infer: true }),
        backoff: { type: 'exponential', delay: this.config.get('BATCH_BACKOFF_MS', { infer: true }) },
      },
    );
    this.logger.log(`Lote ${batchId} concluído`);
    return true;
  }
}
