import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  // Ao receber SIGTERM, o BullMQ termina os jobs em andamento antes de sair.
  app.enableShutdownHooks();
  Logger.log('Worker de lotes iniciado', 'Bootstrap');
}

void bootstrap();
