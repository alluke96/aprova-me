import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssignorsService } from './assignors/assignors.service';
import { BatchProgressService } from './batches/batch-progress.service';
import { DeadLetterProcessor } from './batches/dead-letter.processor';
import { NotificationsProcessor } from './batches/notifications.processor';
import { PayableProcessor } from './batches/payable.processor';
import { validateEnv } from './config/env';
import { MailModule } from './mail/mail.module';
import { PayablesService } from './payables/payables.service';
import { PrismaModule } from './prisma/prisma.module';
import { QueuesModule } from './queues/queues.module';

/**
 * Processo separado da API (`node dist/worker.js`). Assim dá para escalar quem
 * processa lotes sem escalar quem atende requisições, e um lote pesado não
 * deixa a API lenta.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    QueuesModule,
    MailModule,
  ],
  providers: [
    AssignorsService,
    PayablesService,
    BatchProgressService,
    PayableProcessor,
    DeadLetterProcessor,
    NotificationsProcessor,
  ],
})
export class WorkerModule {}
