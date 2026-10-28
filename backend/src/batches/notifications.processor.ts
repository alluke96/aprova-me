import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { BatchCompletedJob, NOTIFICATIONS_QUEUE } from '../queues/queues.constants';

/** Envia o e-mail de lote processado (nível 7), com retentativa se o SMTP falhar. */
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super();
  }

  async process(job: Job<BatchCompletedJob>): Promise<void> {
    const batch = await this.prisma.batch.findUnique({ where: { id: job.data.batchId } });
    if (!batch) {
      this.logger.warn(`Lote ${job.data.batchId} não existe mais; e-mail ignorado`);
      return;
    }
    await this.mail.sendBatchReport(batch);
  }
}
