import { Module } from '@nestjs/common';
import { QueuesModule } from '../queues/queues.module';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

/** Lado da API: recebe o lote e publica na fila. Quem processa é o WorkerModule. */
@Module({
  imports: [QueuesModule],
  controllers: [BatchesController],
  providers: [BatchesService],
})
export class BatchesModule {}
