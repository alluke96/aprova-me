import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { DEAD_LETTER_QUEUE, DeadPayableJob } from '../queues/queues.constants';

/** Avisa o time de operações sobre cada item que chegou à fila morta (nível 8). */
@Processor(DEAD_LETTER_QUEUE)
export class DeadLetterProcessor extends WorkerHost {
  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job<DeadPayableJob>): Promise<void> {
    await this.mail.sendDeadLetterAlert(job.data);
  }
}
