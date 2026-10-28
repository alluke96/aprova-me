import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env';
import { DEAD_LETTER_QUEUE, NOTIFICATIONS_QUEUE, PAYABLES_QUEUE } from './queues.constants';

/** Conexão com o Redis e registro das filas, compartilhados pela API e pelo worker. */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
          password: config.get('REDIS_PASSWORD', { infer: true }),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: PAYABLES_QUEUE },
      { name: DEAD_LETTER_QUEUE },
      { name: NOTIFICATIONS_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
