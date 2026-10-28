import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Payable, Prisma } from '@prisma/client';
import { AssignorsService, toAssignorResponse } from '../assignors/assignors.service';
import { AssignorResponse } from '../assignors/dto/assignor.dto';
import { paginate, Paginated, PaginationQueryDto, toSkipTake } from '../common/dto/pagination';
import { formatDateOnly, toDateOnly } from '../common/validation/date';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePayableRequestDto,
  PayableDto,
  PayableResponse,
  UpdatePayableDto,
} from './dto/payable.dto';
import { AssignorNotFoundError, PayableConflictError } from './payable.errors';

type Db = PrismaService | Prisma.TransactionClient;

export function toPayableResponse(payable: Payable): PayableResponse {
  return {
    id: payable.id,
    value: payable.value.toFixed(2),
    emissionDate: formatDateOnly(payable.emissionDate),
    assignor: payable.assignorId,
    createdAt: payable.createdAt,
    updatedAt: payable.updatedAt,
  };
}

function isSamePayable(existing: Payable, input: PayableDto): boolean {
  return (
    existing.value.equals(new Prisma.Decimal(input.value)) &&
    formatDateOnly(existing.emissionDate) === input.emissionDate.slice(0, 10) &&
    existing.assignorId === input.assignor
  );
}

@Injectable()
export class PayablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignors: AssignorsService,
  ) {}

  /** `POST /integrations/payable`: grava cedente (se enviado) e recebível na mesma transação. */
  async create(
    request: CreatePayableRequestDto,
  ): Promise<{ payable: PayableResponse; assignor: AssignorResponse }> {
    const { payable, assignor } = request;

    if (assignor && assignor.id !== payable.assignor) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dados inválidos',
        errors: [
          {
            field: 'payable.assignor',
            messages: ['payable.assignor deve ser igual a assignor.id'],
          },
        ],
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const savedAssignor = assignor
          ? await this.assignors.upsert(assignor, tx)
          : await tx.assignor.findUnique({ where: { id: payable.assignor } });
        const { payable: saved } = await this.createIdempotent(payable, tx);

        return {
          payable: toPayableResponse(saved),
          // Se o cedente não existisse, createIdempotent já teria lançado o erro.
          assignor: toAssignorResponse(savedAssignor!),
        };
      });
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  /**
   * Cria o recebível de forma idempotente. Reenviar o mesmo id com os mesmos dados
   * devolve o existente (`created: false`), o que torna seguro o retry do cliente
   * e do worker de lotes. Usado pela API e pelo processamento em lote.
   */
  async createIdempotent(
    input: PayableDto,
    db: Db = this.prisma,
  ): Promise<{ payable: Payable; created: boolean }> {
    const existing = await db.payable.findUnique({ where: { id: input.id } });
    if (existing) {
      if (!isSamePayable(existing, input)) throw new PayableConflictError(input.id);
      return { payable: existing, created: false };
    }

    const assignor = await db.assignor.findUnique({
      where: { id: input.assignor },
      select: { id: true },
    });
    if (!assignor) throw new AssignorNotFoundError(input.assignor);

    const payable = await db.payable.create({
      data: {
        id: input.id,
        value: new Prisma.Decimal(input.value),
        emissionDate: toDateOnly(input.emissionDate),
        assignorId: input.assignor,
      },
    });
    return { payable, created: true };
  }

  async findAll(query: PaginationQueryDto): Promise<Paginated<PayableResponse>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payable.findMany({ orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
      this.prisma.payable.count(),
    ]);
    return paginate(items.map(toPayableResponse), total, query);
  }

  async findOne(id: string): Promise<PayableResponse> {
    const payable = await this.prisma.payable.findUnique({ where: { id } });
    if (!payable) throw new NotFoundException('Recebível não encontrado');
    return toPayableResponse(payable);
  }

  async update(id: string, dto: UpdatePayableDto): Promise<PayableResponse> {
    await this.findOne(id);

    if (dto.assignor !== undefined) {
      const assignor = await this.prisma.assignor.findUnique({ where: { id: dto.assignor } });
      if (!assignor) throw this.toHttpError(new AssignorNotFoundError(dto.assignor));
    }

    const updated = await this.prisma.payable.update({
      where: { id },
      data: {
        ...(dto.value !== undefined && { value: new Prisma.Decimal(dto.value) }),
        ...(dto.emissionDate !== undefined && { emissionDate: toDateOnly(dto.emissionDate) }),
        ...(dto.assignor !== undefined && { assignorId: dto.assignor }),
      },
    });
    return toPayableResponse(updated);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.payable.delete({ where: { id } });
  }

  private toHttpError(error: unknown): unknown {
    if (error instanceof AssignorNotFoundError) {
      return new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dados inválidos',
        errors: [{ field: 'payable.assignor', messages: [error.message] }],
      });
    }
    if (error instanceof PayableConflictError) {
      return new ConflictException(error.message);
    }
    return error;
  }
}
