import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Batch } from '@prisma/client';
import { Queue } from 'bullmq';
import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePayableJob, JOBS, jobIds, PAYABLES_QUEUE } from '../queues/queues.constants';
import { BatchResponse, CreateBatchDto } from './dto/batch.dto';

const ENQUEUE_CHUNK = 1_000;
const FAILURES_IN_RESPONSE = 100;

export function toBatchResponse(batch: Batch): BatchResponse {
  return {
    id: batch.id,
    status: batch.status,
    total: batch.total,
    succeeded: batch.succeeded,
    failed: batch.failed,
    pending: batch.total - batch.succeeded - batch.failed,
    createdAt: batch.createdAt,
    finishedAt: batch.finishedAt,
  };
}

@Injectable()
export class BatchesService {
  private readonly logger = new Logger(BatchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    @InjectQueue(PAYABLES_QUEUE) private readonly queue: Queue<CreatePayableJob>,
  ) {}

  /**
   * Registra o lote e publica um job por recebível. Não processa nada aqui:
   * responde 202 na hora e o worker faz o trabalho em segundo plano (nível 7).
   */
  async create(dto: CreateBatchDto): Promise<BatchResponse> {
    this.assertNoDuplicates(dto);

    const batch = await this.prisma.batch.create({ data: { total: dto.payables.length } });
    const attempts = this.config.get('BATCH_MAX_ATTEMPTS', { infer: true });
    const delay = this.config.get('BATCH_BACKOFF_MS', { infer: true });

    try {
      for (let start = 0; start < dto.payables.length; start += ENQUEUE_CHUNK) {
        const chunk = dto.payables.slice(start, start + ENQUEUE_CHUNK);
        await this.queue.addBulk(
          chunk.map((payable) => ({
            name: JOBS.createPayable,
            data: { batchId: batch.id, payable: { ...payable } },
            opts: {
              jobId: jobIds.payable(batch.id, payable.id),
              attempts,
              backoff: { type: 'exponential', delay },
              removeOnComplete: { age: 3_600, count: 10_000 },
              removeOnFail: { age: 86_400 },
            },
          })),
        );
      }
    } catch (error) {
      // Sem os jobs o lote nunca terminaria; melhor desfazer e avisar o cliente.
      this.logger.error(`Falha ao enfileirar o lote ${batch.id}`, error as Error);
      await this.prisma.batch.delete({ where: { id: batch.id } });
      throw new ServiceUnavailableException('Fila indisponível, tente novamente em instantes');
    }

    this.logger.log(`Lote ${batch.id} recebido com ${batch.total} recebível(is)`);
    return toBatchResponse(batch);
  }

  async findOne(id: string): Promise<BatchResponse> {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        items: {
          where: { status: 'FAILED' },
          orderBy: { createdAt: 'asc' },
          take: FAILURES_IN_RESPONSE,
        },
      },
    });
    if (!batch) throw new NotFoundException('Lote não encontrado');

    return {
      ...toBatchResponse(batch),
      failures: batch.items.map((item) => ({
        payableId: item.payableId,
        attempts: item.attempts,
        error: item.error,
      })),
    };
  }

  private assertNoDuplicates(dto: CreateBatchDto): void {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const { id } of dto.payables) {
      if (seen.has(id)) duplicates.add(id);
      seen.add(id);
    }
    if (duplicates.size > 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dados inválidos',
        errors: [
          {
            field: 'payables',
            messages: [`ids repetidos no lote: ${[...duplicates].slice(0, 10).join(', ')}`],
          },
        ],
      });
    }
  }
}
